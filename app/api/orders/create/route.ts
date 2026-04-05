import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import {
  generateSecurePassword,
  generateVerificationCode,
  getCurrentUser,
  hashPassword,
} from "@/lib/auth";
import { createOrder } from "@/lib/orders";
import { getExchangeRates } from "@/lib/exchange-rates";
import {
  sendAdminOrderNotification,
  sendCheckoutAccountEmail,
  sendOrderPaymentLinkEmail,
} from "@/lib/email";
import { calculateShipping } from "@/lib/shipping";
import { logError, logEvent } from "@/lib/ops-log";
import {
  createOneTimePaymentLink,
  isTbankConfigured,
  type ReceiptParams,
} from "@/lib/tbank";
import { getClientIp, getDeviceInfo } from "@/lib/request-info";
import { formatRub } from "@/lib/utils";
import { notifyNewRegistration } from "@/lib/telegram";

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

    if (typeof passportIssueDate === "string") {
      const parts = passportIssueDate.split("-").map(Number);
      const issueDate = parts.length === 3 ? new Date(parts[0], parts[1] - 1, parts[2]) : new Date(passportIssueDate);
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      if (!Number.isNaN(issueDate.getTime()) && issueDate > today) {
        return NextResponse.json(
          { error: "Дата выдачи паспорта не может быть больше текущей даты" },
          { status: 400 }
        );
      }
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
      select: { id: true, price: true, originalPrice: true, soldOut: true, disabled: true },
    });

    const unavailable = items.filter((item: { productId: string }) => {
      const p = productsFromDb.find((x) => x.id === item.productId);
      return !p || p.soldOut || p.disabled;
    });
    if (unavailable.length > 0) {
      return NextResponse.json(
        {
          error:
            "В заказе есть недоступные товары (распроданы или сняты с продажи). Обновите корзину и попробуйте снова.",
        },
        { status: 400 }
      );
    }
    // Цена продажи в EUR (с учётом скидки) — база для расчёта комиссии (наценки)
    const productSellingPriceEur = new Map(
      productsFromDb.map((p) => [p.id, p.price])
    );

    // Доставка: суммарный вес заказа (вес единицы × qty по позициям), один тариф по таблице
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
    const { totalCost: shippingCost, totalWeight } = calculateShipping(cartItems, shippingRates);

    const rates = await getExchangeRates();
    // Сумма вознаграждения комиссионера (наценка; промокод применяется только к ней)
    let totalCommission = 0;
    for (const item of items) {
      const sellingPriceEur = productSellingPriceEur.get(item.productId);
      if (sellingPriceEur != null && sellingPriceEur > 0 && rates) {
        const costInRub = (sellingPriceEur / rates.eurRate) * rates.rubRate;
        const itemCommission = Math.max(0, (item.productPrice - costInRub) * item.quantity);
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
          { error: `Минимальная сумма заказа для промокода — ${formatRub(promoRecord.minOrderAmount)} ₽` },
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

    // Получаем IP-адрес и информацию об устройстве
    const ipAddress = getClientIp(request);
    const deviceInfo = getDeviceInfo(request);

    const emailLower = email.toLowerCase();
    let orderUserId: string | undefined = currentUser?.userId;
    let needsEmailVerification = false;

    if (!currentUser) {
      const existingUser = await prisma.user.findUnique({
        where: { email: emailLower },
      });

      if (existingUser?.emailVerified) {
        return NextResponse.json(
          {
            error:
              "Этот email уже зарегистрирован. Войдите в аккаунт, чтобы оформить заказ.",
          },
          { status: 400 }
        );
      }

      const plainPassword = generateSecurePassword();
      const passwordHash = await hashPassword(plainPassword);
      const code = generateVerificationCode();
      const expiresAt = new Date();
      expiresAt.setMinutes(expiresAt.getMinutes() + 15);

      const phoneDigits =
        typeof phone === "string"
          ? phone.replace(/\D/g, "").replace(/^8/, "7").slice(0, 11)
          : "";
      const phoneNormalized = phoneDigits.startsWith("7")
        ? phoneDigits
        : phoneDigits
          ? "7" + phoneDigits
          : null;

      if (existingUser) {
        await prisma.user.update({
          where: { id: existingUser.id },
          data: {
            passwordHash,
            firstName: firstName || null,
            lastName: lastName || null,
            middleName: middleName || null,
            ...(phoneNormalized ? { phone: phoneNormalized } : {}),
            ipAddress,
            deviceInfo,
          },
        });
        orderUserId = existingUser.id;
      } else {
        const newUser = await prisma.user.create({
          data: {
            email: emailLower,
            passwordHash,
            emailVerified: false,
            firstName: firstName || null,
            lastName: lastName || null,
            middleName: middleName || null,
            ...(phoneNormalized ? { phone: phoneNormalized } : {}),
            ipAddress,
            deviceInfo,
          },
        });
        orderUserId = newUser.id;
        await notifyNewRegistration({
          email: newUser.email,
          firstName: newUser.firstName,
        });
      }

      await prisma.emailVerification.updateMany({
        where: { email: emailLower, used: false },
        data: { used: true },
      });

      await prisma.emailVerification.create({
        data: {
          email: emailLower,
          code,
          expiresAt,
        },
      });

      const sent = await sendCheckoutAccountEmail(emailLower, code, plainPassword);
      if (!sent) {
        return NextResponse.json(
          {
            error:
              "Не удалось отправить письмо с кодом подтверждения. Попробуйте позже или обратитесь в поддержку.",
          },
          { status: 500 }
        );
      }

      needsEmailVerification = true;
    }

    // Создание заказа (курсы сохраняем для точного расчёта комиссии в админке)
    const { order, accessToken } = await createOrder({
      userId: orderUserId,
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
      items: items.map((item: any) => {
        const priceEur = productSellingPriceEur.get(item.productId) ?? null;
        let commissionAmount: number | null = null;
        if (priceEur != null && priceEur > 0 && rates.eurRate && rates.rubRate) {
          const costInRub = (priceEur / rates.eurRate) * rates.rubRate;
          commissionAmount = Math.max(0, (item.productPrice - costInRub) * item.quantity);
        }
        return {
          productId: item.productId,
          productName: item.productName,
          productPrice: item.productPrice,
          originalPriceEur: priceEur,
          commissionAmount,
          selectedColor: item.selectedColor,
          quantity: item.quantity,
        };
      }),
      totalAmount,
      shippingCost, // полная стоимость доставки (скидка только с комиссии)
      eurRate: rates.eurRate,
      rubRate: rates.rubRate,
      ipAddress,
      deviceInfo,
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

    // Сохраняем фамилию, отчество и телефон в профиль пользователя для подстановки при следующем заказе.
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

    // Платёжная ссылка T-Bank СБП (EACQ: Init + GetQr)
    let paymentLink: string | null = null;
    let paymentId: string | null = null;
    let paymentLinkAvailable = false;
    let customerPaymentEmailSent = false;
    const orderNumber = order.orderNumber || order.id;
    const description = `Оплата заказа ${orderNumber}`.slice(0, 140);
    let baseUrl =
      process.env.NEXT_PUBLIC_SITE_URL ||
      request.headers.get("origin") ||
      "";
    if (!baseUrl && request.headers.get("x-forwarded-proto") && request.headers.get("x-forwarded-host")) {
      baseUrl = `${request.headers.get("x-forwarded-proto")}://${request.headers.get("x-forwarded-host")}`;
    }
    if (!baseUrl && request.headers.get("host")) {
      baseUrl = `https://${request.headers.get("host")}`;
    }
    const successUrl = baseUrl ? `${baseUrl}/order-confirmation?id=${order.id}&paid=1&token=${accessToken}` : "";
    const failUrl = baseUrl ? `${baseUrl}/order-confirmation?id=${order.id}&token=${accessToken}` : "";
    const notificationUrl = baseUrl ? `${baseUrl}/api/webhooks/tbank` : "";

    if (!isTbankConfigured()) {
      console.warn("T-Bank не настроен: TBANK_TERMINAL или TBANK_PASSWORD не заданы");
    } else if (!successUrl || !failUrl || !notificationUrl) {
      console.warn("T-Bank: не удалось определить baseUrl", {
        baseUrl,
        origin: request.headers.get("origin"),
        host: request.headers.get("host"),
        forwardedProto: request.headers.get("x-forwarded-proto"),
        forwardedHost: request.headers.get("x-forwarded-host"),
        NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
      });
    } else {
      const amountKopecks = Math.round(totalAmount * 100);
      if (amountKopecks < 1000) {
        console.warn("T-Bank: сумма меньше минимума", { amountKopecks, totalAmount });
      } else {
        // Для боевого терминала чек обязателен: без Receipt T-Bank возвращает ErrorCode 309.
        // Receipt: сумма Items должна равняться Init.Amount (товары + доставка - скидка)
        const receiptItems = order.items.map((item) => {
          const priceKopecks = Math.round(item.productPrice * 100);
          const quantity = item.quantity;
          const amountKopecks = priceKopecks * quantity;
          return {
            name: item.productName.slice(0, 128),
            price: priceKopecks,
            quantity,
            amount: amountKopecks,
          };
        });

        let itemsSum = receiptItems.reduce((s, i) => s + i.amount, 0);

        // Добавляем доставку в чек
        if (shippingCost > 0) {
          const shipKopecks = Math.round(shippingCost * 100);
          receiptItems.push({
            name: "Доставка",
            price: shipKopecks,
            quantity: 1,
            amount: shipKopecks,
          });
          itemsSum += shipKopecks;
        }

        // Добавляем скидку как отдельную позицию (отрицательная сумма)
        if (discountAmount > 0) {
          const discountKopecks = Math.round(discountAmount * 100);
          receiptItems.push({
            name: "Скидка по промокоду",
            price: -discountKopecks,
            quantity: 1,
            amount: -discountKopecks,
          });
          itemsSum -= discountKopecks;
        }

        // Коррекция округления: сумма Items должна точно равняться Init.Amount
        const diff = amountKopecks - itemsSum;
        if (diff !== 0 && receiptItems.length > 0) {
          const lastItem = receiptItems[receiptItems.length - 1];
          lastItem.amount += diff;
          lastItem.price = lastItem.amount;
        }

        const receiptParams: ReceiptParams = {
          email: order.email,
          taxation: "usn_income" as const,
          items: receiptItems,
        };

        try {
          const result = await createOneTimePaymentLink({
            orderId: order.id,
            amountKopecks,
            description,
            successUrl,
            failUrl,
            notificationUrl,
            receipt: receiptParams,
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

          const siteBase = baseUrl.replace(/\/+$/, "");
          const payPageUrl = `${siteBase}/order/${order.id}/pay?token=${encodeURIComponent(accessToken)}`;
          const itemsForPayEmail = order.items.map((item) => ({
            name: item.productName,
            quantity: item.quantity,
            price: item.productPrice * item.quantity,
          }));
          try {
            customerPaymentEmailSent = await sendOrderPaymentLinkEmail(order.email, orderNumber, {
              firstName: order.firstName,
              totalAmount: order.totalAmount,
              items: itemsForPayEmail,
              payPageUrl,
              paymentLink: result.link,
              shippingCost,
              totalWeightKg: totalWeight,
              promoDiscount: discountAmount,
            });
          } catch (payEmailErr) {
            console.error("sendOrderPaymentLinkEmail failed:", payEmailErr);
          }
        } catch (tbankError) {
          const errorMsg = tbankError instanceof Error ? tbankError.message : String(tbankError);
          console.error("T-Bank createOneTimePaymentLink failed:", {
            error: errorMsg,
            orderId: order.id,
            amountKopecks,
            hasReceipt: Boolean(receiptParams),
            baseUrl,
            successUrl,
            failUrl,
            notificationUrl,
          });
          logEvent("order_payment_link_failed", {
            requestId,
            orderId: order.id,
            error: errorMsg,
            amountKopecks,
            hasReceipt: Boolean(receiptParams),
          });
        }
      }
    }

    // Отправка email: клиенту — ссылка на оплату при успешном создании СБП-ссылки (выше); при оплате — вебхук T-Bank
    const emailNotification = {
      customerEmailSent: false,
      adminEmailSent: false,
      error: undefined as string | undefined,
    };
    try {
      emailNotification.customerEmailSent = customerPaymentEmailSent;

      emailNotification.adminEmailSent = await sendAdminOrderNotification(orderNumber, order.id, {
        email: order.email,
        firstName: order.firstName,
        lastName: order.lastName,
        middleName: order.middleName,
        phone: order.phone,
        cdekAddress: order.cdekAddress,
        inn: order.inn,
        passportSeries: order.passportSeries,
        passportNumber: order.passportNumber,
        passportIssueDate: order.passportIssueDate,
        passportIssuedBy: order.passportIssuedBy,
        totalAmount: order.totalAmount,
        shippingCost: order.shippingCost,
        promoDiscount: order.promoDiscount,
        eurRate: order.eurRate,
        rubRate: order.rubRate,
        items: order.items.map((item) => ({
          productName: item.productName,
          productPrice: item.productPrice,
          quantity: item.quantity,
          selectedColor: item.selectedColor,
          originalPriceEur: item.originalPriceEur,
          commissionAmount: item.commissionAmount,
        })),
      });

      // Telegram уведомление отправляется только после оплаты заказа (из webhook T-Bank)
    } catch (emailError) {
      console.error("Error sending order emails:", emailError);
      emailNotification.error =
        emailError instanceof Error ? emailError.message : "Ошибка отправки email";
    }

    logEvent("order_create_success", {
      requestId,
      orderId: order.id,
      orderNumber: order.orderNumber || order.id,
      userId: order.userId || orderUserId || null,
      emailCustomerSent: emailNotification.customerEmailSent,
      emailAdminSent: emailNotification.adminEmailSent,
      emailError: emailNotification.error || null,
    });

    const { accessToken: _, ...orderSafe } = order;
    return NextResponse.json({
      success: true,
      order: {
        ...orderSafe,
        paymentLink: paymentLink ?? order.paymentLink ?? undefined,
        paymentId: paymentId ?? order.paymentId ?? undefined,
      },
      accessToken,
      paymentLink: paymentLink ?? undefined,
      paymentLinkAvailable,
      emailNotification,
      needsEmailVerification,
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
