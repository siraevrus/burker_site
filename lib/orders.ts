import { prisma } from "./db";
import { Order, OrderItem } from "./types";

/**
 * Генерирует читаемый номер заказа в формате:
 * burker_YYYYMMDDHHmmss_userId_orderId_XXX
 * 
 * @param userId - ID пользователя или null для гостевых заказов
 * @param orderId - ID заказа (cuid)
 * @param orderCount - порядковый номер заказа в системе (начиная с 1)
 * @returns номер заказа в формате burker_YYYYMMDDHHmmss_userId_orderId_XXX
 */
function generateOrderNumber(userId: string | null | undefined, orderId: string, orderCount: number): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  const hours = String(now.getHours()).padStart(2, "0");
  const minutes = String(now.getMinutes()).padStart(2, "0");
  const seconds = String(now.getSeconds()).padStart(2, "0");
  
  const dateTime = `${year}${month}${day}${hours}${minutes}${seconds}`;
  const userIdPart = userId || "guest";
  const orderIdPart = orderId.slice(0, 8); // Первые 8 символов cuid
  const sequentialNumber = String(orderCount).padStart(3, "0"); // 001, 002, 003...
  
  return `burker_${dateTime}_${userIdPart}_${orderIdPart}_${sequentialNumber}`;
}

// Преобразование данных из БД в формат Order
function mapOrderFromDb(dbOrder: any): Order {
  return {
    id: dbOrder.id,
    orderNumber: dbOrder.orderNumber || undefined,
    userId: dbOrder.userId || undefined,
    email: dbOrder.email,
    firstName: dbOrder.firstName,
    lastName: dbOrder.lastName || "",
    middleName: dbOrder.middleName || "",
    phone: dbOrder.phone,
    address: dbOrder.address,
    cdekAddress: dbOrder.cdekAddress || "",
    cdekPointCode: dbOrder.cdekPointCode || undefined,
    city: dbOrder.city || undefined,
    postalCode: dbOrder.postalCode || undefined,
    country: dbOrder.country || undefined,
    comment: dbOrder.comment || undefined,
    inn: dbOrder.inn || "",
    passportSeries: dbOrder.passportSeries || "",
    passportNumber: dbOrder.passportNumber || "",
    passportIssueDate: dbOrder.passportIssueDate || "",
    passportIssuedBy: dbOrder.passportIssuedBy || "",
    status: dbOrder.status,
    totalAmount: dbOrder.totalAmount,
    shippingCost: dbOrder.shippingCost,
    items: dbOrder.items?.map((item: any) => ({
      id: item.id,
      orderId: item.orderId,
      productId: item.productId,
      productName: item.productName,
      productPrice: item.productPrice,
      selectedColor: item.selectedColor,
      quantity: item.quantity,
    })) || [],
    createdAt: dbOrder.createdAt,
    updatedAt: dbOrder.updatedAt,
  };
}

// Получить заказ по ID
export async function getOrderById(id: string): Promise<Order | null> {
  const dbOrder = await prisma.order.findUnique({
    where: { id },
    include: {
      items: true,
    },
  });

  return dbOrder ? mapOrderFromDb(dbOrder) : null;
}

// Получить заказы пользователя
export async function getUserOrders(userId: string): Promise<Order[]> {
  const dbOrders = await prisma.order.findMany({
    where: { userId },
    include: {
      items: true,
    },
    orderBy: { createdAt: "desc" },
  });

  return dbOrders.map(mapOrderFromDb);
}

// Получить заказы по email (для гостевых заказов)
export async function getOrdersByEmail(email: string): Promise<Order[]> {
  const dbOrders = await prisma.order.findMany({
    where: { email },
    include: {
      items: true,
    },
    orderBy: { createdAt: "desc" },
  });

  return dbOrders.map(mapOrderFromDb);
}

// Создать заказ
export async function createOrder(orderData: {
  userId?: string;
  email: string;
  firstName: string;
  lastName: string;
  middleName: string;
  phone: string;
  address: string;
  cdekAddress: string;
  cdekPointCode?: string;
  city?: string;
  postalCode?: string;
  country?: string;
  comment?: string;
  inn: string;
  passportSeries: string;
  passportNumber: string;
  passportIssueDate: string;
  passportIssuedBy: string;
  items: Array<{
    productId: string;
    productName: string;
    productPrice: number;
    selectedColor: string;
    quantity: number;
  }>;
  totalAmount: number;
  shippingCost: number;
}): Promise<Order> {
  const orderDataForCreate: any = {
    email: orderData.email,
    firstName: orderData.firstName,
    lastName: orderData.lastName,
    middleName: orderData.middleName,
    phone: orderData.phone,
    address: orderData.address,
    cdekAddress: orderData.cdekAddress,
    cdekPointCode: orderData.cdekPointCode || null,
    city: orderData.city || null,
    postalCode: orderData.postalCode || null,
    country: orderData.country || "Россия",
    comment: orderData.comment || null,
    inn: orderData.inn,
    passportSeries: orderData.passportSeries,
    passportNumber: orderData.passportNumber,
    passportIssueDate: orderData.passportIssueDate,
    passportIssuedBy: orderData.passportIssuedBy,
    status: "pending",
    totalAmount: orderData.totalAmount,
    shippingCost: orderData.shippingCost,
    items: {
      create: orderData.items.map((item) => ({
        productId: item.productId,
        productName: item.productName,
        productPrice: item.productPrice,
        selectedColor: item.selectedColor,
        quantity: item.quantity,
      })),
    },
  };

  // Добавляем userId только если он указан
  if (orderData.userId) {
    orderDataForCreate.userId = orderData.userId;
  }

  // Создаем заказ сначала без orderNumber
  const order = await prisma.order.create({
    data: orderDataForCreate,
    include: {
      items: true,
    },
  });

  // Получаем общее количество заказов в системе для порядкового номера
  const orderCount = await prisma.order.count();
  const sequentialNumber = orderCount;
  
  // Генерируем номер заказа с реальным orderId
  const orderNumber = generateOrderNumber(order.userId, order.id, sequentialNumber);
  
  // Обновляем заказ с номером
  const updatedOrder = await prisma.order.update({
    where: { id: order.id },
    data: { orderNumber },
    include: { items: true },
  });

  return mapOrderFromDb(updatedOrder);
}
