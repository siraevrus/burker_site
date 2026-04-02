export const FISCAL_SETTLEMENT_PLACE = "https://burker-watches.ru/";
export const FISCAL_GROUP = "Main_2";
export const FISCAL_TAXATION_SYSTEM_USN_INCOME = 1;
export const FISCAL_TAX_NO_VAT = 6;
export const FISCAL_PAYMENT_METHOD_FULL_PAYMENT = 4;
/** Аванс (денежными средствами), ФФД 1.2 */
export const FISCAL_PAYMENT_METHOD_ADVANCE = 3;
export const FISCAL_PAYMENT_TYPE_CASHLESS = 2;
/** В блоке оплат чека: зачёт предоплаты (аванса), ФФД 1.2, тип 14 по протоколу Orange Data */
export const FISCAL_CHECK_PAYMENT_PREPAYMENT = 14;
export const FISCAL_PAYMENT_SUBJECT_PRODUCT = 1;
export const FISCAL_PAYMENT_SUBJECT_SERVICE = 4;
export const FISCAL_PAYMENT_SUBJECT_AGENT_FEE = 11;
/** Платёж (аванс / предоплата по ФФД 1.2, значение 10) */
export const FISCAL_PAYMENT_SUBJECT_PAYMENT = 10;
export const FISCAL_ADVANCE_POSITION_TEXT =
  "Аванс по договору комиссии за выкуп товара";
export const FISCAL_AGENT_TYPE_COMMISSIONER = 32;
export const FISCAL_SUPPLIER_INN = "000000000000";
export const FISCAL_SUPPLIER_NAME = "BURKER INTERNATIONAL BV";
export const FISCAL_COMMISSION_LABEL =
  "Вознаграждение комиссионера по приобретению товара по поручению клиента";

/** Закрывающий чек: услуга доставки СДЭК (фиксированный текст) */
export const FISCAL_CLOSING_SHIPPING_NAME =
  "Услуги доставки по Договор №ИМ-ВБ-ELE-3";
export const FISCAL_CLOSING_CDEK_SUPPLIER_NAME = 'ООО "Сдэк-Глобал"';
export const FISCAL_CLOSING_CDEK_INN = "7722327689";

export interface FiscalReceiptItem {
  type: "product" | "commission" | "shipping" | "advance";
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

export interface FiscalReceiptOrderItemInput {
  productName: string;
  productPrice: number;
  quantity: number;
  commissionAmount?: number | null;
  originalPriceEur?: number | null;
}

export interface FiscalReceiptOrderInput {
  promoDiscount?: number | null;
  shippingCost: number;
  items: FiscalReceiptOrderItemInput[];
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

function allocateCommissionDiscounts(order: FiscalReceiptOrderInput): number[] {
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

export function buildFiscalReceiptItems(order: FiscalReceiptOrderInput): FiscalReceiptItem[] {
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

/**
 * Авансовый чек при оплате: одна позиция, как в Orange Data (предмет 10, способ 3).
 */
export function buildAdvanceFiscalReceiptItems(totalAmount: number): FiscalReceiptItem[] {
  const amount = Math.max(0, totalAmount);
  return [
    {
      type: "advance",
      name: FISCAL_ADVANCE_POSITION_TEXT,
      quantity: 1,
      price: amount,
      amount,
      tax: FISCAL_TAX_NO_VAT,
      paymentMethodType: FISCAL_PAYMENT_METHOD_ADVANCE,
      paymentSubjectType: FISCAL_PAYMENT_SUBJECT_PAYMENT,
    },
  ];
}

export interface ClosingFiscalOrderItem {
  originalPriceEur: number | null;
  quantity: number;
}

export interface ClosingFiscalInput {
  adminOrderRef: string;
  totalAmount: number;
  deliveryToRussiaRub: number;
  customsOrderDate: Date;
  cbrEurRubOnOrderDate: number;
  items: ClosingFiscalOrderItem[];
}

/**
 * Закрывающий чек к авансу: 3 позиции (товар BV, доставка СДЭК, комиссия).
 * Суммы в рублях с копейками; позиция 3 = totalAmount − поз.1 − поз.2 (копейки).
 */
export type ClosingFiscalBuildResult =
  | { ok: true; nameLine1: string; line1Rub: number; line2Rub: number; line3Rub: number }
  | { ok: false; error: string };

export function buildClosingFiscalReceiptData(input: ClosingFiscalInput): ClosingFiscalBuildResult {
  const ref = input.adminOrderRef.trim();
  if (!ref) {
    return { ok: false, error: "Не указан номер ордера (adminOrderRef)" };
  }

  let eurSum = 0;
  for (const it of input.items) {
    const eur = it.originalPriceEur != null ? Number(it.originalPriceEur) : 0;
    if (!Number.isFinite(eur) || eur < 0) {
      return { ok: false, error: "Некорректная цена в EUR в позиции заказа" };
    }
    eurSum += eur * Math.max(1, it.quantity);
  }
  if (eurSum <= 0) {
    return { ok: false, error: "Сумма заказа в EUR (originalPriceEur × qty) должна быть больше 0" };
  }

  const cbr = input.cbrEurRubOnOrderDate;
  if (!Number.isFinite(cbr) || cbr <= 0) {
    return { ok: false, error: "Некорректный курс EUR/RUB" };
  }

  const totalCents = toCents(input.totalAmount);
  const line1Cents = Math.round(eurSum * cbr * 100);
  const line2Cents = toCents(input.deliveryToRussiaRub);
  const line3Cents = totalCents - line1Cents - line2Cents;

  if (line1Cents < 0 || line2Cents < 0) {
    return { ok: false, error: "Некорректные суммы позиций 1–2" };
  }
  if (line3Cents < 0) {
    return {
      ok: false,
      error:
        "Итог заказа меньше суммы товара по курсу и доставки — проверьте totalAmount, EUR, курс и доставку",
    };
  }

  const d = input.customsOrderDate;
  const dateStr = d.toLocaleDateString("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
  const nameLine1 =
    `Заказ №${ref}, ${eurSum.toFixed(2)} EUR, курс ЦБ на ${dateStr}: ${cbr.toFixed(2)} RUB`.slice(
      0,
      128
    );

  return {
    ok: true,
    nameLine1,
    line1Rub: fromCents(line1Cents),
    line2Rub: fromCents(line2Cents),
    line3Rub: fromCents(line3Cents),
  };
}
