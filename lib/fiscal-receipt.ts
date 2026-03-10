import type { Order } from "./types";

export const FISCAL_SETTLEMENT_PLACE = "https://burker-watches.ru/";
export const FISCAL_GROUP = "Main_2";
export const FISCAL_TAXATION_SYSTEM_USN_INCOME = 1;
export const FISCAL_TAX_NO_VAT = 6;
export const FISCAL_PAYMENT_METHOD_FULL_PAYMENT = 4;
export const FISCAL_PAYMENT_TYPE_CASHLESS = 2;
export const FISCAL_PAYMENT_SUBJECT_PRODUCT = 1;
export const FISCAL_PAYMENT_SUBJECT_SERVICE = 4;
export const FISCAL_PAYMENT_SUBJECT_AGENT_FEE = 11;
export const FISCAL_AGENT_TYPE_COMMISSIONER = 32;
export const FISCAL_SUPPLIER_INN = "000000000000";
export const FISCAL_SUPPLIER_NAME = "BURKER INTERNATIONAL BV";
export const FISCAL_COMMISSION_LABEL =
  "Вознаграждение комиссионера по приобретению товара по поручению клиента";

export interface FiscalReceiptItem {
  type: "product" | "commission" | "shipping";
  name: string;
  quantity: number;
  price: number;
  amount: number;
  tax: number;
  paymentMethodType: number;
  paymentSubjectType: number;
  supplierINN?: string;
  supplierInfo?: {
    name: string;
    phoneNumbers?: string[];
  };
  agentType?: number;
  originalPriceEur?: number;
}

function toCents(amount: number): number {
  return Math.round((amount + Number.EPSILON) * 100);
}

function fromCents(amountCents: number): number {
  return amountCents / 100;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function allocateCommissionDiscounts(order: Order): number[] {
  const commissionCentsByItem = order.items.map((item) => {
    const grossCents = toCents(item.productPrice * item.quantity);
    return clamp(toCents(item.commissionAmount ?? 0), 0, grossCents);
  });

  const totalCommissionCents = commissionCentsByItem.reduce((sum, value) => sum + value, 0);
  const totalDiscountCents = clamp(
    toCents(order.promoDiscount ?? 0),
    0,
    totalCommissionCents
  );

  if (totalCommissionCents === 0 || totalDiscountCents === 0) {
    return commissionCentsByItem.map(() => 0);
  }

  const exactShares = commissionCentsByItem.map(
    (commissionCents) => (commissionCents * totalDiscountCents) / totalCommissionCents
  );
  const allocations = exactShares.map((share) => Math.floor(share));

  let remainder = totalDiscountCents - allocations.reduce((sum, value) => sum + value, 0);
  const rankedRemainders = exactShares
    .map((share, index) => ({
      index,
      fraction: share - allocations[index],
    }))
    .sort((a, b) => b.fraction - a.fraction || a.index - b.index);

  for (const { index } of rankedRemainders) {
    if (remainder <= 0) break;
    if (allocations[index] >= commissionCentsByItem[index]) continue;
    allocations[index] += 1;
    remainder -= 1;
  }

  return allocations;
}

export function buildFiscalReceiptItems(order: Order): FiscalReceiptItem[] {
  const items: FiscalReceiptItem[] = [];
  const discountAllocations = allocateCommissionDiscounts(order);

  for (const [index, item] of order.items.entries()) {
    const quantity = Math.max(1, item.quantity);
    const grossCents = toCents(item.productPrice * quantity);
    const grossUnitPriceCents = toCents(item.productPrice);
    const rawCommissionCents = clamp(toCents(item.commissionAmount ?? 0), 0, grossCents);
    const discountCents = clamp(discountAllocations[index] ?? 0, 0, rawCommissionCents);

    if (rawCommissionCents <= 0) {
      items.push({
        type: "product",
        name: item.productName,
        quantity,
        price: fromCents(grossUnitPriceCents),
        amount: fromCents(grossUnitPriceCents * quantity),
        tax: FISCAL_TAX_NO_VAT,
        paymentMethodType: FISCAL_PAYMENT_METHOD_FULL_PAYMENT,
        paymentSubjectType: FISCAL_PAYMENT_SUBJECT_PRODUCT,
        supplierINN: FISCAL_SUPPLIER_INN,
        supplierInfo: { name: FISCAL_SUPPLIER_NAME },
        agentType: FISCAL_AGENT_TYPE_COMMISSIONER,
        originalPriceEur: item.originalPriceEur ?? undefined,
      });
      continue;
    }

    const supplierTargetCents = Math.max(0, grossCents - rawCommissionCents);
    const supplierUnitPriceCents = Math.floor(supplierTargetCents / quantity);
    const supplierAmountCents = supplierUnitPriceCents * quantity;

    if (supplierAmountCents > 0) {
      items.push({
        type: "product",
        name: item.productName,
        quantity,
        price: fromCents(supplierUnitPriceCents),
        amount: fromCents(supplierAmountCents),
        tax: FISCAL_TAX_NO_VAT,
        paymentMethodType: FISCAL_PAYMENT_METHOD_FULL_PAYMENT,
        paymentSubjectType: FISCAL_PAYMENT_SUBJECT_PRODUCT,
        supplierINN: FISCAL_SUPPLIER_INN,
        supplierInfo: { name: FISCAL_SUPPLIER_NAME },
        agentType: FISCAL_AGENT_TYPE_COMMISSIONER,
        originalPriceEur: item.originalPriceEur ?? undefined,
      });
    }

    const commissionAmountCents = Math.max(0, grossCents - discountCents - supplierAmountCents);
    if (commissionAmountCents > 0) {
      items.push({
        type: "commission",
        name: FISCAL_COMMISSION_LABEL,
        quantity: 1,
        price: fromCents(commissionAmountCents),
        amount: fromCents(commissionAmountCents),
        tax: FISCAL_TAX_NO_VAT,
        paymentMethodType: FISCAL_PAYMENT_METHOD_FULL_PAYMENT,
        paymentSubjectType: FISCAL_PAYMENT_SUBJECT_AGENT_FEE,
      });
    }
  }

  if (order.shippingCost > 0) {
    const shippingAmountCents = toCents(order.shippingCost);
    items.push({
      type: "shipping",
      name: "Доставка",
      quantity: 1,
      price: fromCents(shippingAmountCents),
      amount: fromCents(shippingAmountCents),
      tax: FISCAL_TAX_NO_VAT,
      paymentMethodType: FISCAL_PAYMENT_METHOD_FULL_PAYMENT,
      paymentSubjectType: FISCAL_PAYMENT_SUBJECT_SERVICE,
    });
  }

  return items;
}
