/**
 * Подготовка данных заказа для генерации PDF-чека.
 * Формат по образцу receipt.pdf (ФФД 1.2, агентская модель).
 */

import type { Order } from "./types";

export interface ReceiptConfig {
  sellerName: string;
  sellerAddress: string;
  inn: string;
  siteUrl: string;
  senderEmail: string;
  supplierInn: string;
  supplierName: string;
  taxationSystem?: string;
}

export interface ReceiptItem {
  type: "product" | "commission" | "shipping" | "discount";
  name: string;
  quantity: number;
  price: number;
  amount: number;
  originalPriceEur?: number;
  commissionAmount?: number;
}

export interface ReceiptData {
  config: ReceiptConfig;
  orderNumber: string;
  dateTime: string;
  dateForCbr: string;
  customerEmail: string;
  items: ReceiptItem[];
  totalAmount: number;
  cashAmount: number;
  electronicAmount: number;
  eurPerRub: number | null;
}

function getReceiptConfig(): ReceiptConfig {
  const siteUrl = process.env.SITE_URL || process.env.NEXT_PUBLIC_SITE_URL || "https://burker-watches.ru";
  return {
    sellerName: process.env.RECEIPT_SELLER_NAME || "",
    sellerAddress: process.env.RECEIPT_SELLER_ADDRESS || "",
    inn: process.env.ORANGEDATA_INN || "",
    siteUrl,
    senderEmail: process.env.RECEIPT_SENDER_EMAIL || process.env.ADMIN_EMAIL || "",
    supplierInn: process.env.RECEIPT_SUPPLIER_INN || "000000000000",
    supplierName: process.env.RECEIPT_SUPPLIER_NAME || "BURKER INTERNATIONAL BV",
    taxationSystem: "УСН ДОХОД",
  };
}

/**
 * Курс EUR/RUB (сколько рублей за 1 евро).
 * eurRate = usdPerRub/eurPerRub, rubRate = usdPerRub.
 * Отсюда: eurPerRub = rubRate / eurRate.
 */
function getEurPerRub(order: Order): number | null {
  if (order.rubRate != null && order.eurRate != null && order.eurRate > 0) {
    return order.rubRate / order.eurRate;
  }
  return null;
}

function formatDateTime(d: Date): string {
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = d.getFullYear();
  const hours = String(d.getHours()).padStart(2, "0");
  const minutes = String(d.getMinutes()).padStart(2, "0");
  return `${day}.${month}.${year} ${hours}:${minutes}`;
}

function formatDateForCbr(d: Date): string {
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = d.getFullYear();
  return `${day}.${month}.${year}`;
}

/**
 * Преобразует Order + items в структуру для PDF-чека.
 */
export function mapOrderToReceiptData(order: Order): ReceiptData {
  const config = getReceiptConfig();
  const dateToUse = order.paidAt || order.createdAt;
  const eurPerRub = getEurPerRub(order);

  const items: ReceiptItem[] = [];

  for (const item of order.items) {
    const amount = item.productPrice * item.quantity;
    items.push({
      type: "product",
      name: item.productName,
      quantity: item.quantity,
      price: item.productPrice,
      amount,
      originalPriceEur: item.originalPriceEur ?? undefined,
      commissionAmount: item.commissionAmount ?? undefined,
    });
  }

  if (order.shippingCost > 0) {
    items.push({
      type: "shipping",
      name: "Доставка",
      quantity: 1,
      price: order.shippingCost,
      amount: order.shippingCost,
    });
  }

  const discountAmount = order.promoDiscount ?? 0;
  if (discountAmount > 0) {
    items.push({
      type: "discount",
      name: "Скидка по промокоду",
      quantity: 1,
      price: -discountAmount,
      amount: -discountAmount,
    });
  }

  const cashAmount = 0;
  const electronicAmount = order.totalAmount;

  return {
    config,
    orderNumber: order.orderNumber || order.id,
    dateTime: formatDateTime(dateToUse),
    dateForCbr: formatDateForCbr(dateToUse),
    customerEmail: order.email,
    items,
    totalAmount: order.totalAmount,
    cashAmount,
    electronicAmount,
    eurPerRub,
  };
}
