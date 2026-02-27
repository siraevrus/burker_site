import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { createOrder } from "@/lib/orders";
import { getExchangeRates } from "@/lib/exchange-rates";
import { sendOrderConfirmation, sendAdminOrderNotification } from "@/lib/email";
import { notifyNewOrder } from "@/lib/telegram";
import { calculateShipping } from "@/lib/shipping";
import { logError, logEvent } from "@/lib/ops-log";
import {
  createOneTimePaymentLink,
  isTbankConfigured,
  getAccountNumber,
} from "@/lib/tbank";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request: NextRequest) {
  try {
    const requestId = crypto.randomUUID();
    const body = await request.json();
    if (!body || typeof body !== "object") {
      return NextResponse.json(
        { error: "Некорректное тело запроса" },
        { status: 400 }
      );
    }

    const {
      email,
      firstName,
      lastName,
      middleName,
      phone,
      address,
      cdekAddress,
      cdekPointCode,
      city,
      postalCode,
      country,
      inn,
      passportSeries,
      passportNumber,
      passportIssueDate,
      passportIssuedBy,
      requiresConfirmation,
      promoCode,
      promoDiscount,
      items,
    } = body;

    // Валидация обязательных полей
    if (
      !email ||
      !firstName ||
      !lastName ||
      !middleName ||
      !phone ||
      !cdekAddress ||
      !inn ||
      !passportSeries ||
      !passportNumber ||
      !passportIssueDate ||
      !passportIssuedBy ||
      !items ||
      items.length === 0
    ) {
      return NextResponse.json(
        { error: "Заполните все обязательные поля" },
        { status: 400 }
      );
    }

    if (typeof email !== "string" || !EMAIL_RE.test(email.toLowerCase())) {
      return NextResponse.json(
        { error: "Некорректный email" },
        { status: 400 }
      );
    }

    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: "Список товаров пуст" },
        { status: 400 }
      );
    }

    const invalidItem = items.find(
      (item: any) =>
        !item ||
        typeof item !== "object" ||
        typeof item.productId !== "string" ||
        typeof item.productName !== "string" ||
        typeof item.productPrice !== "number" ||
        typeof item.quantity !== "number" ||
        item.quantity <= 0 ||
        item.productPrice < 0 ||
        typeof item.selectedColor !== "string"
    );

    if (invalidItem) {
      return NextResponse.json(
        { error: "Некорректные данные товаров в заказе" },
        { status: 400 }
      );
    }

    // Получение текущего пользователя (может быть null для гостевых заказов)
    const currentUser = await getCurrentUser();

    // Расчет суммы товаров
    const itemsTotal = items.reduce(
      (sum: number, item: any) => sum + item.productPrice * item.quantity,
      0
    );

    // Получаем оригинальные цены в EUR из базы данных для расчета вознаграждения комиссионера
    const productIds = items.map((item: any) => item.productId);
    const productsFromDb = await prisma.product.findMany({
      where: { id: { in: productIds } },
      select: { id: true, originalPrice: true },
    });
    const productPricesEur = new Map(
      productsFromDb.map((p) => [p.id, p.originalPrice])
    );

    // Расчет стоимости доставки на основе веса и категории товаров
    // Преобразуем items в формат CartItem для функции calculateShipping
    const cartItems = items.map((item: any) => ({
      id: item.productId,
      collection: item.collection || "", // Используем переданную collection или пустую строку
      quantity: item.quantity,
      price: item.productPrice,
      name: item.productName,
      selectedColor: item.selectedColor,
      // Остальные поля не нужны для расчета доставки
      bodyId: undefined,
      subcategory: undefined,
      bestseller: false,
      originalPrice: item.productPrice,
      discount: 0,
      colors: [],
      images: [],
      inStock: true,
    }));
    
    const rateRows = await prisma.shippingRate.findMany({ orderBy: { weightKg: "asc" } });
    const shippingRates = rateRows.length > 0
      ? rateRows.map((r) => ({ weight: r.weightKg, price: r.priceRub }))
      : undefined;
    const { totalCost: shippingCost } = calculateShipping(cartItems, shippingRates);

    const rates = await getExchangeRates();
    // Сумма вознаграждения комиссионера (промокод применяется только к ней)
    let totalCommission = 0;
    for (const item of items) {
      const originalPriceEur = productPricesEur.get(item.productId);
      if (originalPriceEur != null && originalPriceEur > 0 && rates) {
        const originalPriceInRub = (originalPriceEur / rates.eurRate) * rates.rubRate;
        const itemCommission = Math.max(0, (item.productPrice - originalPriceInRub) * item.quantity);
        totalCommission += itemCommission;
      }
    }

    // Серверная валидация промокода; скидка только с вознаграждения комиссионера
    let discountAmount = 0;
    let validatedPromoCodeId: string | null = null;
    let validatedPromoDiscountType: string | null = null;

    if (promoCode) {
      const promoRecord = await prisma.promoCode.findUnique({
        where: { code: promoCode.toUpperCase() },
      });

      if (!promoRecord || !promoRecord.isActive) {
        return NextResponse.json({ error: "Промокод не действителен" }, { status: 400 });
      }

      const now = new Date();
      if (now < promoRecord.validFrom || now > promoRecord.validUntil) {
        return NextResponse.json({ error: "Срок действия промокода истёк" }, { status: 400 });
      }

      const emailLower = email.toLowerCase();

      const usageCount = await prisma.promoCodeUsage.count({
        where: { promoCodeId: promoRecord.id, email: emailLower },
      });
      if (usageCount >= promoRecord.usageLimit) {
        return NextResponse.json(
          { error: "Вы уже воспользовались данным промокодом" },
          { status: 400 }
        );
      }

      if (promoRecord.firstOrderOnly) {
        const paidOrders = await prisma.order.count({
          where: { email: emailLower, status: { not: "cancelled" } },
        });
        if (paidOrders > 0) {
          return NextResponse.json(
            { error: "Промокод распространяется только на первый заказ" },
            { status: 400 }
          );
        }
      }

      if (promoRecord.minOrderAmount && itemsTotal < promoRecord.minOrderAmount) {
        return NextResponse.json(
          { error: `Минимальная сумма заказа для промокода — ${promoRecord.minOrderAmount.toFixed(0)} ₽` },
          { status: 400 }
        );
      }

      // Скидка не может превышать комиссию (комиссия после скидки не меньше 0)
      const rawDiscount =
        promoRecord.discountType === "percent"
          ? Math.round(totalCommission * promoRecord.discount / 100)
          : promoRecord.discount;
      discountAmount = Math.min(rawDiscount, totalCommission);

      validatedPromoCodeId = promoRecord.id;
      validatedPromoDiscountType = promoRecord.discountType;
    }

    // Скидка только с комиссии; доставку не уменьшаем, итог = товары + доставка − скидка
    const totalAmount = itemsTotal + shippingCost - discountAmount;

    // Создание заказа (курсы сохраняем для точного расчёта комиссии в админке)
    const order = await createOrder({
      userId: currentUser?.userId,
      email: email.toLowerCase(),
      firstName,
      lastName,
      middleName,
      phone,
      address: address || undefined,
      cdekAddress,
      cdekPointCode,
      city,
      postalCode,
      country: country || "Россия",
      comment: undefined,
      inn,
      passportSeries,
      passportNumber,
      passportIssueDate,
      passportIssuedBy,
      requiresConfirmation: requiresConfirmation || false,
      promoCode: promoCode || null,
      promoDiscount: discountAmount,
      promoDiscountType: validatedPromoDiscountType,
      items: items.map((item: any) => ({
        productId: item.productId,
        productName: item.productName,
        productPrice: item.productPrice,
        originalPriceEur: productPricesEur.get(item.productId) || null,
        selectedColor: item.selectedColor,
        quantity: item.quantity,
      })),
      totalAmount,
      shippingCost, // полная стоимость доставки (скидка только с комиссии)
      eurRate: rates.eurRate,
      rubRate: rates.rubRate,
    });

    // Запись использования промокода
    if (validatedPromoCodeId && promoCode) {
      await prisma.promoCodeUsage.create({
        data: {
          promoCodeId: validatedPromoCodeId,
          email: email.toLowerCase(),
          orderId: order.id,
        },
      });
    }

    // Сохраняем фамилию, отчество и телефон в профиль пользователя для подстановки при следующем заказе
    if (currentUser?.userId && (lastName || middleName || phone)) {
      const data: { lastName?: string; middleName?: string; phone?: string } = {};
      if (lastName) data.lastName = lastName;
      if (middleName) data.middleName = middleName;
      if (phone && typeof phone === "string") {
        const digits = phone.replace(/\D/g, "").replace(/^8/, "7").slice(0, 11);
        data.phone = digits.startsWith("7") ? digits : "7" + digits;
      }
      if (Object.keys(data).length > 0) {
        await prisma.user.update({
          where: { id: currentUser.userId },
          data,
        });
      }
    }

    // Платёжная ссылка T-Bank СБП
    let paymentLink: string | null = null;
    let paymentId: string | null = null;
    let paymentLinkAvailable = false;
    const orderNumber = order.orderNumber || order.id;
    const purpose = `Оплата заказа ${orderNumber}`.slice(0, 210);
    let origin =
      process.env.NEXT_PUBLIC_SITE_URL ||
      request.headers.get("origin") ||
      "";
    if (!origin && request.headers.get("x-forwarded-proto") && request.headers.get("x-forwarded-host")) {
      origin = `${request.headers.get("x-forwarded-proto")}://${request.headers.get("x-forwarded-host")}`;
    }
    if (!origin && request.headers.get("host")) {
      origin = `https://${request.headers.get("host")}`;
    }
    const redirectUrl = origin
      ? `${origin}/order-confirmation?id=${order.id}&paid=1`
      : "";

    if (isTbankConfigured() && redirectUrl) {
      const accountNumber = getAccountNumber();
      if (accountNumber) {
        try {
          const result = await createOneTimePaymentLink({
            accountNumber,
            sum: totalAmount,
            purpose,
            ttl: 3,
            vat: "0",
            redirectUrl,
          });
          await prisma.order.update({
            where: { id: order.id },
            data: {
              paymentId: result.qrId,
              paymentLink: result.link,
            },
          });
          paymentLink = result.link;
          paymentId = result.qrId;
          paymentLinkAvailable = true;
        } catch (tbankError) {
          console.error("T-Bank createOneTimePaymentLink failed:", tbankError);
          logEvent("order_payment_link_failed", {
            requestId,
            orderId: order.id,
            error: tbankError instanceof Error ? tbankError.message : String(tbankError),
          });
        }
      }
    }

    // Отправка email уведомлений
    const emailNotification = {
      customerEmailSent: false,
      adminEmailSent: false,
      error: undefined as string | undefined,
    };
    try {
      const orderNumber = order.orderNumber || order.id;
      emailNotification.customerEmailSent = await sendOrderConfirmation(order.email, orderNumber, {
        firstName: order.firstName,
        totalAmount: order.totalAmount,
        items: order.items.map((item) => ({
          name: item.productName,
          quantity: item.quantity,
          price: item.productPrice * item.quantity,
        })),
      });

      emailNotification.adminEmailSent = await sendAdminOrderNotification(orderNumber, order.id, {
        email: order.email,
        firstName: order.firstName,
        phone: order.phone,
        address: order.address || order.cdekAddress,
        totalAmount: order.totalAmount,
        itemsCount: order.items.length,
      });

      await notifyNewOrder({
        orderNumber,
        orderId: order.id,
        email: order.email,
        firstName: order.firstName,
        phone: order.phone,
        totalAmount: order.totalAmount,
        itemsCount: order.items.length,
      });
    } catch (emailError) {
      console.error("Error sending order emails:", emailError);
      emailNotification.error =
        emailError instanceof Error ? emailError.message : "Ошибка отправки email";
    }

    logEvent("order_create_success", {
      requestId,
      orderId: order.id,
      orderNumber: order.orderNumber || order.id,
      userId: currentUser?.userId || null,
      emailCustomerSent: emailNotification.customerEmailSent,
      emailAdminSent: emailNotification.adminEmailSent,
      emailError: emailNotification.error || null,
    });

    return NextResponse.json({
      success: true,
      order: {
        ...order,
        paymentLink: paymentLink ?? order.paymentLink ?? undefined,
        paymentId: paymentId ?? order.paymentId ?? undefined,
      },
      paymentLink: paymentLink ?? undefined,
      paymentLinkAvailable,
      emailNotification,
    });
  } catch (error: any) {
    logError("order_create_error", {
      requestId: crypto.randomUUID(),
      error: error?.message || "Unknown error",
    });
    return NextResponse.json(
      { error: error.message || "Ошибка при создании заказа" },
      { status: 500 }
    );
  }
}
