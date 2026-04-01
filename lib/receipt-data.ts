/**
 * Подготовка данных заказа для генерации PDF-чека.
 * Поддержка авансового чека (ФФД 1.2, одна позиция — аванс)
 * и закрывающего чека (полный расчёт, зачёт предоплаты).
 */

import {
  buildAdvanceFiscalReceiptItems,
  buildClosingFiscalReceiptData,
  FISCAL_CLOSING_CDEK_INN,
  FISCAL_CLOSING_CDEK_SUPPLIER_NAME,
  FISCAL_CLOSING_SHIPPING_NAME,
  FISCAL_COMMISSION_LABEL,
  FISCAL_SETTLEMENT_PLACE,
  FISCAL_SUPPLIER_INN,
  FISCAL_SUPPLIER_NAME,
  FISCAL_TAX_NO_VAT,
  FISCAL_PAYMENT_METHOD_FULL_PAYMENT,
  FISCAL_PAYMENT_SUBJECT_PRODUCT,
  FISCAL_PAYMENT_SUBJECT_SERVICE,
  FISCAL_PAYMENT_SUBJECT_AGENT_FEE,
  type FiscalReceiptItem,
} from "./fiscal-receipt";
import type { Order } from "./types";

export type ReceiptType = "advance" | "closing";

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
  receiptType: ReceiptType;
  orderNumber: string;
  dateTime: string;
  dateForCbr: string;
  customerEmail: string;
  items: ReceiptItem[];
  totalAmount: number;
  cashAmount: number;
  electronicAmount: number;
  prepaymentAmount: number;
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
 * Авансовый чек: одна позиция «аванс», оплата безналичными.
 */
export function mapOrderToReceiptData(order: Order): ReceiptData {
  const config = getReceiptConfig();
  const dateToUse = order.paidAt || order.createdAt;
  const eurPerRub = getEurPerRub(order);
  const items: ReceiptItem[] = buildAdvanceFiscalReceiptItems(Number(order.totalAmount));

  return {
    config,
    receiptType: "advance",
    orderNumber: order.orderNumber || order.id,
    dateTime: formatDateTime(dateToUse),
    dateForCbr: formatDateForCbr(dateToUse),
    customerEmail: order.email,
    items,
    totalAmount: order.totalAmount,
    cashAmount: 0,
    electronicAmount: order.totalAmount,
    prepaymentAmount: 0,
    eurPerRub,
  };
}

/**
 * Закрывающий чек: 3 позиции (товар, доставка, комиссия),
 * оплата — зачёт предоплаты (аванса) на всю сумму.
 */
export function mapOrderToClosingReceiptData(order: Order): ReceiptData {
  const config = getReceiptConfig();
  const dateToUse = order.paidAt || order.createdAt;
  const eurPerRub = getEurPerRub(order);
  const orderNumber = order.orderNumber || order.id;

  const ref = order.adminOrderRef?.trim() ?? orderNumber;
  const deliveryRub = Number(order.deliveryToRussiaRub ?? 0);
  const cbrRate = Number(order.cbrEurRubOnOrderDate ?? 0);
  const customsDate = order.customsOrderDate
    ? new Date(order.customsOrderDate)
    : (order.paidAt || order.createdAt);

  const built = buildClosingFiscalReceiptData({
    adminOrderRef: ref,
    totalAmount: order.totalAmount,
    deliveryToRussiaRub: deliveryRub,
    customsOrderDate: customsDate,
    cbrEurRubOnOrderDate: cbrRate,
    items: order.items.map((it) => ({
      originalPriceEur: it.originalPriceEur ?? null,
      quantity: it.quantity,
    })),
  });

  let items: ReceiptItem[];

  if (built.ok) {
    items = [
      {
        type: "product",
        name: built.nameLine1,
        quantity: 1,
        price: built.line1Rub,
        amount: built.line1Rub,
        tax: FISCAL_TAX_NO_VAT,
        paymentMethodType: FISCAL_PAYMENT_METHOD_FULL_PAYMENT,
        paymentSubjectType: FISCAL_PAYMENT_SUBJECT_PRODUCT,
        supplierINN: FISCAL_SUPPLIER_INN,
        supplierInfo: { name: FISCAL_SUPPLIER_NAME },
        agentType: 32,
      },
      {
        type: "shipping",
        name: FISCAL_CLOSING_SHIPPING_NAME,
        quantity: 1,
        price: built.line2Rub,
        amount: built.line2Rub,
        tax: FISCAL_TAX_NO_VAT,
        paymentMethodType: FISCAL_PAYMENT_METHOD_FULL_PAYMENT,
        paymentSubjectType: FISCAL_PAYMENT_SUBJECT_SERVICE,
        supplierINN: FISCAL_CLOSING_CDEK_INN,
        supplierInfo: { name: FISCAL_CLOSING_CDEK_SUPPLIER_NAME },
        agentType: 32,
      },
      {
        type: "commission",
        name: FISCAL_COMMISSION_LABEL,
        quantity: 1,
        price: built.line3Rub,
        amount: built.line3Rub,
        tax: FISCAL_TAX_NO_VAT,
        paymentMethodType: FISCAL_PAYMENT_METHOD_FULL_PAYMENT,
        paymentSubjectType: FISCAL_PAYMENT_SUBJECT_AGENT_FEE,
      },
    ];
  } else {
    items = buildAdvanceFiscalReceiptItems(Number(order.totalAmount));
  }

  return {
    config,
    receiptType: "closing",
    orderNumber,
    dateTime: formatDateTime(dateToUse),
    dateForCbr: formatDateForCbr(dateToUse),
    customerEmail: order.email,
    items,
    totalAmount: order.totalAmount,
    cashAmount: 0,
    electronicAmount: 0,
    prepaymentAmount: order.totalAmount,
    eurPerRub: eurPerRub && cbrRate > 0 ? cbrRate : eurPerRub,
  };
}
