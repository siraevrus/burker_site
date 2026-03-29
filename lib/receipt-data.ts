/**
 * Подготовка данных заказа для генерации PDF-чека.
 * Формат PDF как авансовый чек при оплате (ФФД 1.2, одна позиция — аванс).
 */

import {
  buildAdvanceFiscalReceiptItems,
  FISCAL_SETTLEMENT_PLACE,
  FISCAL_SUPPLIER_INN,
  FISCAL_SUPPLIER_NAME,
  type FiscalReceiptItem,
} from "./fiscal-receipt";
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

export type ReceiptItem = FiscalReceiptItem;

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
  return {
    sellerName: process.env.RECEIPT_SELLER_NAME || "",
    sellerAddress: process.env.RECEIPT_SELLER_ADDRESS || "",
    inn: process.env.ORANGEDATA_INN || "",
    siteUrl: FISCAL_SETTLEMENT_PLACE,
    senderEmail: process.env.RECEIPT_SENDER_EMAIL || process.env.ADMIN_EMAIL || "",
    supplierInn: FISCAL_SUPPLIER_INN,
    supplierName: FISCAL_SUPPLIER_NAME,
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
  const items: ReceiptItem[] = buildAdvanceFiscalReceiptItems(Number(order.totalAmount));

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
