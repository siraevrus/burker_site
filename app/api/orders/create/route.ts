import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { createOrder } from "@/lib/orders";
import { sendOrderConfirmation, sendAdminOrderNotification } from "@/lib/email";
import { calculateShipping } from "@/lib/shipping";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
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

    // Получение текущего пользователя (может быть null для гостевых заказов)
    const currentUser = await getCurrentUser();

    // Расчет суммы товаров
    const itemsTotal = items.reduce(
      (sum: number, item: any) => sum + item.productPrice * item.quantity,
      0
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
    
    const { totalCost: shippingCost } = calculateShipping(cartItems);
    const discountAmount = promoDiscount ? parseFloat(promoDiscount.toString()) : 0;
    const totalAmount = Math.max(0, itemsTotal + shippingCost - discountAmount);

    // Создание заказа
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
      comment: null,
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
        selectedColor: item.selectedColor,
        quantity: item.quantity,
      })),
      totalAmount,
      shippingCost,
    });

    // Отправка email уведомлений
    try {
      const orderNumber = order.orderNumber || order.id;
      await sendOrderConfirmation(order.email, orderNumber, {
        firstName: order.firstName,
        totalAmount: order.totalAmount,
        items: order.items.map((item) => ({
          name: item.productName,
          quantity: item.quantity,
          price: item.productPrice * item.quantity,
        })),
      });

      await sendAdminOrderNotification(orderNumber, order.id, {
        email: order.email,
        firstName: order.firstName,
        phone: order.phone,
        address: order.address || order.cdekAddress,
        totalAmount: order.totalAmount,
        itemsCount: order.items.length,
      });
    } catch (emailError) {
      console.error("Error sending order emails:", emailError);
      // Не прерываем создание заказа из-за ошибки email
    }

    return NextResponse.json({
      success: true,
      order,
    });
  } catch (error: any) {
    console.error("Create order error:", error);
    return NextResponse.json(
      { error: error.message || "Ошибка при создании заказа" },
      { status: 500 }
    );
  }
}
