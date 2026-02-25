import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { createOrder } from "@/lib/orders";
import { getExchangeRates } from "@/lib/exchange-rates";
import { sendOrderConfirmation, sendAdminOrderNotification } from "@/lib/email";
import { calculateShipping } from "@/lib/shipping";
import { logError, logEvent } from "@/lib/ops-log";

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
    const discountAmount = promoDiscount ? parseFloat(promoDiscount.toString()) : 0;
    const shippingAfterDiscount = Math.max(0, shippingCost - discountAmount);
    const totalAmount = itemsTotal + shippingAfterDiscount;

    const rates = await getExchangeRates();

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
      items: items.map((item: any) => ({
        productId: item.productId,
        productName: item.productName,
        productPrice: item.productPrice,
        originalPriceEur: productPricesEur.get(item.productId) || null,
        selectedColor: item.selectedColor,
        quantity: item.quantity,
      })),
      totalAmount,
      shippingCost: shippingAfterDiscount,
      eurRate: rates.eurRate,
      rubRate: rates.rubRate,
    });

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
      order,
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
