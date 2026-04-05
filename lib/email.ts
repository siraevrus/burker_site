import { sendEmailViaMailopost, sendEmailWithAttachment } from "./mailopost";
import { formatRub } from "./utils";

// Конфигурация из переменных окружения
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || process.env.MAILOPOST_FROM_EMAIL || "";
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || process.env.SITE_URL || "http://localhost:3000";
const IS_PRODUCTION = process.env.NODE_ENV === "production";

/** Экранирование HTML для предотвращения XSS в письмах */
function esc(s: string): string {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** Подпись в письмах: Мира Брендс | Буркер со ссылкой на сайт */
const EMAIL_FOOTER = `<p style="color: #999; font-size: 12px;"><a href="${SITE_URL}" style="color: #999; text-decoration: none;">Мира Брендс | Буркер</a></p>`;

/** Пояснение про расчёт доставки по весу и тарифам (письма с составом заказа) */
const EMAIL_SHIPPING_COST_EXPLANATION = `<p style="font-size: 13px; color: #666; line-height: 1.5; margin: 0 0 16px 0;">
        Стоимость доставки рассчитывается по <strong>суммарному весу</strong> всего заказа и действующей тарифной сетке
        (часы — 0,3 кг за единицу, украшения — 0,1 кг за единицу; вес позиций суммируется).
      </p>`;

/**
 * Отправка кода верификации на email через Mailopost API.
 * В режиме разработки (NODE_ENV !== production) код дополнительно выводится в консоль.
 */
export async function sendVerificationCode(
  email: string,
  code: string
): Promise<boolean> {
  if (!IS_PRODUCTION) {
    console.log("\n📧 Код верификации:", email, "→", code);
  }

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #333;">Подтверждение email адреса</h2>
      <p>Здравствуйте!</p>
      <p>Для подтверждения вашего email адреса используйте следующий код:</p>
      <div style="background-color: #f5f5f5; padding: 20px; text-align: center; margin: 20px 0;">
        <h1 style="color: #A13D42; font-size: 32px; letter-spacing: 5px; margin: 0;">${code}</h1>
      </div>
      <p>Код действителен в течение 15 минут.</p>
      <p>Если вы не регистрировались на нашем сайте, просто проигнорируйте это письмо.</p>
      <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
      ${EMAIL_FOOTER}
    </div>
  `;

  const result = await sendEmailViaMailopost(
    email,
    "Подтверждение email адреса",
    html
  );

  return result.success;
}

/**
 * Письмо после оформления заказа без входа: код подтверждения email и сгенерированный пароль для входа.
 */
export async function sendCheckoutAccountEmail(
  email: string,
  code: string,
  plainPassword: string
): Promise<boolean> {
  if (!IS_PRODUCTION) {
    console.log("\n📧 Быстрая регистрация:", email, "код:", code, "пароль:", plainPassword);
  }

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #333;">Подтвердите email и сохраните пароль</h2>
      <p>Здравствуйте!</p>
      <p>Вы оформили заказ на сайте. Для завершения регистрации аккаунта введите код подтверждения ниже. После подтверждения вы сможете войти, используя пароль из этого письма.</p>
      <p style="margin: 16px 0 8px 0;"><strong>Код подтверждения email</strong></p>
      <div style="background-color: #f5f5f5; padding: 20px; text-align: center; margin: 12px 0;">
        <h1 style="color: #A13D42; font-size: 32px; letter-spacing: 5px; margin: 0;">${esc(code)}</h1>
      </div>
      <p style="font-size: 13px; color: #666;">Код действителен 15 минут.</p>
      <p style="margin: 20px 0 8px 0;"><strong>Ваш пароль для входа</strong> (сохраните его; после подтверждения email войдите на сайте с этим паролем):</p>
      <div style="background-color: #f9f9f9; padding: 16px; border: 1px solid #e0e0e0; font-family: monospace; font-size: 16px; word-break: break-all;">${esc(plainPassword)}</div>
      <p style="font-size: 13px; color: #666; margin-top: 16px;">Если вы не оформляли заказ, проигнорируйте это письмо.</p>
      <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
      ${EMAIL_FOOTER}
    </div>
  `;

  const result = await sendEmailViaMailopost(
    email,
    "Подтверждение email и пароль для входа — Burker Watches",
    html
  );

  return result.success;
}

/**
 * Отправка уведомления о новом заказе пользователю
 */
export async function sendOrderConfirmation(
  email: string,
  orderNumber: string,
  orderData: {
    firstName: string;
    totalAmount: number;
    items: Array<{ name: string; quantity: number; price: number }>;
    /** Стоимость доставки до РФ, фактически включённая в заказ */
    shippingCost: number;
    /** Оценочный суммарный вес заказа (кг) для расчёта доставки */
    totalWeightKg?: number;
    /** Скидка по промокоду (₽), если была */
    promoDiscount?: number;
  }
): Promise<boolean> {
  if (!IS_PRODUCTION) {
    console.log("📦 Подтверждение заказа #" + orderNumber);
  }

  const itemsList = orderData.items
    .map(
      (item) =>
        `<tr>
          <td style="padding: 10px; border-bottom: 1px solid #eee;">${esc(item.name)}</td>
          <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: center;">${item.quantity}</td>
          <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: right;">${formatRub(item.price)} ₽</td>
        </tr>`
    )
    .join("");

  const weightPart =
    orderData.totalWeightKg != null && Number.isFinite(orderData.totalWeightKg)
      ? ` — оценочный вес заказа ${orderData.totalWeightKg.toLocaleString("ru-RU", {
          minimumFractionDigits: 1,
          maximumFractionDigits: 1,
        })} кг`
      : "";

  const shippingCell =
    orderData.shippingCost <= 0
      ? `<span style="color: #2e7d32; font-weight: bold;">Бесплатно</span>`
      : `${formatRub(orderData.shippingCost)} ₽`;

  const promoDiscount = orderData.promoDiscount ?? 0;
  const promoRow =
    promoDiscount > 0
      ? `<tr>
          <td colspan="2" style="padding: 10px; border-bottom: 1px solid #eee; text-align: right; color: #2e7d32;">Скидка по промокоду:</td>
          <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: right; color: #2e7d32; font-weight: bold;">−${formatRub(promoDiscount)} ₽</td>
        </tr>`
      : "";

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #333;">Спасибо за ваш заказ!</h2>
      <p>Здравствуйте, ${esc(orderData.firstName)}!</p>
      <p>Ваш заказ <strong>#${orderNumber}</strong> успешно принят и находится в обработке.</p>
      
      <h3 style="color: #333; margin-top: 30px;">Детали заказа:</h3>
      <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
        <thead>
          <tr style="background-color: #f5f5f5;">
            <th style="padding: 10px; text-align: left; border-bottom: 2px solid #ddd;">Товар</th>
            <th style="padding: 10px; text-align: center; border-bottom: 2px solid #ddd;">Количество</th>
            <th style="padding: 10px; text-align: right; border-bottom: 2px solid #ddd;">Цена</th>
          </tr>
        </thead>
        <tbody>
          ${itemsList}
          <tr>
            <td colspan="2" style="padding: 10px; border-bottom: 1px solid #eee; text-align: right;">Доставка до РФ${weightPart}:</td>
            <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: right;">${shippingCell}</td>
          </tr>
          ${promoRow}
        </tbody>
        <tfoot>
          <tr>
            <td colspan="2" style="padding: 10px; text-align: right; font-weight: bold;">Итого:</td>
            <td style="padding: 10px; text-align: right; font-weight: bold;">${formatRub(orderData.totalAmount)} ₽</td>
          </tr>
        </tfoot>
      </table>
      ${EMAIL_SHIPPING_COST_EXPLANATION}
      
      <p>Мы свяжемся с вами в ближайшее время для подтверждения заказа.</p>
      <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
      ${EMAIL_FOOTER}
    </div>
  `;

  const result = await sendEmailViaMailopost(
    email,
    `Заказ #${orderNumber} принят — Мира Брендс | Буркер`,
    html
  );

  return result.success;
}

/**
 * Письмо покупателю: состав заказа, сумма, ссылка на страницу оплаты и прямая ссылка СБП.
 * Отправляется при создании платёжной ссылки (до оплаты).
 */
export async function sendOrderPaymentLinkEmail(
  email: string,
  orderNumber: string,
  orderData: {
    firstName: string;
    totalAmount: number;
    items: Array<{ name: string; quantity: number; price: number }>;
    payPageUrl: string;
    paymentLink: string;
    /** Стоимость доставки до РФ, включённая в сумму к оплате */
    shippingCost: number;
    /** Оценочный суммарный вес заказа (кг) для отображения в строке доставки */
    totalWeightKg?: number;
    /** Скидка по промокоду (₽), если была */
    promoDiscount?: number;
  }
): Promise<boolean> {
  if (!IS_PRODUCTION) {
    console.log("💳 Ссылка на оплату заказа #" + orderNumber, orderData.payPageUrl);
  }

  const weightPart =
    orderData.totalWeightKg != null && Number.isFinite(orderData.totalWeightKg)
      ? ` — оценочный вес заказа ${orderData.totalWeightKg.toLocaleString("ru-RU", {
          minimumFractionDigits: 1,
          maximumFractionDigits: 1,
        })} кг`
      : "";

  const shippingCell =
    orderData.shippingCost <= 0
      ? `<span style="color: #2e7d32; font-weight: bold;">Бесплатно</span>`
      : `${formatRub(orderData.shippingCost)} ₽`;

  const promoDiscount = orderData.promoDiscount ?? 0;
  const promoRow =
    promoDiscount > 0
      ? `<tr>
          <td colspan="2" style="padding: 10px; border-bottom: 1px solid #eee; text-align: right; color: #2e7d32;">Скидка по промокоду:</td>
          <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: right; color: #2e7d32; font-weight: bold;">−${formatRub(promoDiscount)} ₽</td>
        </tr>`
      : "";

  const itemsList = orderData.items
    .map(
      (item) =>
        `<tr>
          <td style="padding: 10px; border-bottom: 1px solid #eee;">${esc(item.name)}</td>
          <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: center;">${item.quantity}</td>
          <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: right;">${formatRub(item.price)} ₽</td>
        </tr>`
    )
    .join("");

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #333;">Оплатите заказ</h2>
      <p>Здравствуйте, ${esc(orderData.firstName)}!</p>
      <p>Заказ <strong>#${esc(orderNumber)}</strong> оформлен. Сумма к оплате: <strong>${formatRub(orderData.totalAmount)} ₽</strong>.</p>

      <h3 style="color: #333; margin-top: 24px;">Состав заказа</h3>
      <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
        <thead>
          <tr style="background-color: #f5f5f5;">
            <th style="padding: 10px; text-align: left; border-bottom: 2px solid #ddd;">Товар</th>
            <th style="padding: 10px; text-align: center; border-bottom: 2px solid #ddd;">Кол-во</th>
            <th style="padding: 10px; text-align: right; border-bottom: 2px solid #ddd;">Сумма</th>
          </tr>
        </thead>
        <tbody>
          ${itemsList}
          <tr>
            <td colspan="2" style="padding: 10px; border-bottom: 1px solid #eee; text-align: right;">Доставка до РФ${weightPart}:</td>
            <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: right;">${shippingCell}</td>
          </tr>
          ${promoRow}
        </tbody>
        <tfoot>
          <tr>
            <td colspan="2" style="padding: 10px; text-align: right; font-weight: bold;">Итого к оплате:</td>
            <td style="padding: 10px; text-align: right; font-weight: bold;">${formatRub(orderData.totalAmount)} ₽</td>
          </tr>
        </tfoot>
      </table>

      ${EMAIL_SHIPPING_COST_EXPLANATION}

      <div style="text-align: center; margin: 28px 0;">
        <a href="${esc(orderData.payPageUrl)}" style="display: inline-block; padding: 14px 28px; background-color: #A13D42; color: #fff; text-decoration: none; border-radius: 6px; font-weight: bold;">Перейти к оплате</a>
      </div>

      <p style="font-size: 14px; color: #555;">Если кнопка не открывается, скопируйте ссылку в браузер:<br/>
      <a href="${esc(orderData.payPageUrl)}" style="color: #A13D42; word-break: break-all;">${esc(orderData.payPageUrl)}</a></p>

      <p style="font-size: 14px; color: #555;">Прямая ссылка на оплату (СБП):<br/>
      <a href="${esc(orderData.paymentLink)}" style="color: #A13D42; word-break: break-all;">${esc(orderData.paymentLink)}</a></p>

      <p style="font-size: 13px; color: #777;">После оплаты вы получите подтверждение на эту почту.</p>

      <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
      ${EMAIL_FOOTER}
    </div>
  `;

  const result = await sendEmailViaMailopost(
    email,
    `Оплата заказа #${orderNumber} — Мира Брендс | Буркер`,
    html
  );

  return result.success;
}

/**
 * Отправка уведомления админу о новом заказе
 */
export async function sendAdminOrderNotification(
  orderNumber: string,
  orderId: string,
  orderData: {
    email: string;
    firstName: string;
    lastName: string;
    middleName: string;
    phone: string;
    cdekAddress: string;
    inn: string;
    passportSeries: string;
    passportNumber: string;
    passportIssueDate: string;
    passportIssuedBy: string;
    totalAmount: number;
    shippingCost: number;
    promoDiscount?: number | null;
    eurRate?: number | null;
    rubRate?: number | null;
    items: Array<{
      productName: string;
      productPrice: number;
      quantity: number;
      selectedColor: string;
      originalPriceEur?: number | null;
      commissionAmount?: number | null;
    }>;
  }
): Promise<boolean> {
  if (!IS_PRODUCTION) {
    console.log("🔔 Уведомление админу о заказе #" + orderNumber);
  }

  if (!ADMIN_EMAIL) {
    console.warn("ADMIN_EMAIL не настроен, уведомление админу не отправлено");
    return true;
  }

  const orderLink = `${SITE_URL}/admin/orders?orderId=${orderId}`;

  // Строки позиций заказа
  const itemsRows = orderData.items
    .map(
      (item, i) => `
      <tr style="background: ${i % 2 === 0 ? "#fff" : "#fafafa"};">
        <td style="padding: 8px 10px; border-bottom: 1px solid #eee;">${esc(item.productName)}</td>
        <td style="padding: 8px 10px; border-bottom: 1px solid #eee; text-align: center;">${esc(item.selectedColor)}</td>
        <td style="padding: 8px 10px; border-bottom: 1px solid #eee; text-align: center;">${item.quantity}</td>
        <td style="padding: 8px 10px; border-bottom: 1px solid #eee; text-align: right;">${formatRub(item.productPrice)} ₽</td>
        <td style="padding: 8px 10px; border-bottom: 1px solid #eee; text-align: right;">${formatRub(item.productPrice * item.quantity)} ₽</td>
      </tr>`
    )
    .join("");

  const itemsTotal = orderData.items.reduce(
    (s, item) => s + item.productPrice * item.quantity,
    0
  );

  // Расчёт вознаграждения комиссионера
  let commissionRows = "";
  let totalCommission = 0;
  let hasCommission = false;

  for (const item of orderData.items) {
    if (item.commissionAmount != null) {
      totalCommission += item.commissionAmount;
      hasCommission = true;
    } else if (
      item.originalPriceEur != null &&
      orderData.eurRate != null &&
      orderData.rubRate != null
    ) {
      const costRub = (item.originalPriceEur / orderData.eurRate) * orderData.rubRate;
      const commission = Math.max(0, (item.productPrice - costRub) * item.quantity);
      totalCommission += commission;
      hasCommission = true;
    }
  }

  if (hasCommission) {
    const promoDiscount = orderData.promoDiscount ?? 0;
    const commissionAfterDiscount = Math.max(0, totalCommission - promoDiscount);

    commissionRows = orderData.items
      .map((item, i) => {
        let commission: number | null = null;
        let formula = "";
        if (item.commissionAmount != null) {
          commission = item.commissionAmount;
          if (
            item.originalPriceEur != null &&
            orderData.eurRate != null &&
            orderData.rubRate != null
          ) {
            const costRub = (item.originalPriceEur / orderData.eurRate) * orderData.rubRate;
            formula = `(${formatRub(item.productPrice)} − ${formatRub(costRub)}) × ${item.quantity} = ${formatRub(commission)} ₽`;
          } else {
            formula = `${formatRub(commission)} ₽`;
          }
        } else if (
          item.originalPriceEur != null &&
          orderData.eurRate != null &&
          orderData.rubRate != null
        ) {
          const costRub = (item.originalPriceEur / orderData.eurRate) * orderData.rubRate;
          commission = Math.max(0, (item.productPrice - costRub) * item.quantity);
          formula = `(${formatRub(item.productPrice)} − ${formatRub(costRub)}) × ${item.quantity} = ${formatRub(commission)} ₽`;
        }
        if (commission === null) return "";
        return `
        <tr style="background: ${i % 2 === 0 ? "#fff" : "#fafafa"};">
          <td style="padding: 8px 10px; border-bottom: 1px solid #eee;">${esc(item.productName)}</td>
          <td style="padding: 8px 10px; border-bottom: 1px solid #eee; font-size: 12px; color: #555;">${formula}</td>
          <td style="padding: 8px 10px; border-bottom: 1px solid #eee; text-align: right;">${formatRub(commission)} ₽</td>
        </tr>`;
      })
      .join("");

    const ratesNote =
      orderData.eurRate != null && orderData.rubRate != null
        ? `<p style="font-size: 12px; color: #888; margin: 4px 0 0 0;">Курсы на момент заказа: 1 EUR = ${(1 / orderData.eurRate).toFixed(4)} USD, 1 USD = ${orderData.rubRate.toFixed(4)} ₽</p>`
        : "";

    commissionRows = `
      <h3 style="color: #333; margin: 28px 0 10px 0; font-size: 16px;">Расчёт вознаграждения комиссионера</h3>
      <p style="font-size: 13px; color: #555; margin: 0 0 10px 0;">
        Формула: (Цена продажи в ₽ − Себестоимость в ₽) × Количество<br>
        Себестоимость в ₽ = Цена в EUR ÷ Курс EUR/USD × Курс USD/₽
      </p>
      <table style="width: 100%; border-collapse: collapse; font-size: 14px; margin-bottom: 8px;">
        <thead>
          <tr style="background: #f5f5f5;">
            <th style="padding: 8px 10px; text-align: left; border-bottom: 2px solid #ddd;">Товар</th>
            <th style="padding: 8px 10px; text-align: left; border-bottom: 2px solid #ddd;">Формула</th>
            <th style="padding: 8px 10px; text-align: right; border-bottom: 2px solid #ddd;">Комиссия</th>
          </tr>
        </thead>
        <tbody>${commissionRows}</tbody>
        <tfoot>
          <tr>
            <td colspan="2" style="padding: 8px 10px; font-weight: bold; border-top: 2px solid #ddd;">Итого комиссия (до скидки)</td>
            <td style="padding: 8px 10px; font-weight: bold; text-align: right; border-top: 2px solid #ddd;">${formatRub(totalCommission)} ₽</td>
          </tr>
          ${
            promoDiscount > 0
              ? `<tr>
            <td colspan="2" style="padding: 8px 10px; color: #c0392b; border-bottom: 1px solid #eee;">Скидка по промокоду</td>
            <td style="padding: 8px 10px; color: #c0392b; text-align: right; border-bottom: 1px solid #eee;">−${formatRub(promoDiscount)} ₽</td>
          </tr>
          <tr>
            <td colspan="2" style="padding: 8px 10px; font-weight: bold;">Вознаграждение комиссионера (итого)</td>
            <td style="padding: 8px 10px; font-weight: bold; text-align: right;">${formatRub(commissionAfterDiscount)} ₽</td>
          </tr>`
              : ""
          }
        </tfoot>
      </table>
      ${ratesNote}`;
  }

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 700px; margin: 0 auto; color: #333;">
      <h2 style="color: #333; margin-bottom: 20px;">Новый заказ #${esc(orderNumber)}</h2>

      <h3 style="color: #333; margin: 0 0 10px 0; font-size: 16px;">Данные покупателя</h3>
      <table style="width: 100%; border-collapse: collapse; font-size: 14px; margin-bottom: 20px;">
        <tbody>
          <tr><td style="padding: 6px 10px; width: 200px; color: #666; border-bottom: 1px solid #f0f0f0;">Email</td><td style="padding: 6px 10px; border-bottom: 1px solid #f0f0f0;">${esc(orderData.email)}</td></tr>
          <tr><td style="padding: 6px 10px; color: #666; border-bottom: 1px solid #f0f0f0;">Фамилия</td><td style="padding: 6px 10px; border-bottom: 1px solid #f0f0f0;">${esc(orderData.lastName)}</td></tr>
          <tr><td style="padding: 6px 10px; color: #666; border-bottom: 1px solid #f0f0f0;">Имя</td><td style="padding: 6px 10px; border-bottom: 1px solid #f0f0f0;">${esc(orderData.firstName)}</td></tr>
          <tr><td style="padding: 6px 10px; color: #666; border-bottom: 1px solid #f0f0f0;">Отчество</td><td style="padding: 6px 10px; border-bottom: 1px solid #f0f0f0;">${esc(orderData.middleName)}</td></tr>
          <tr><td style="padding: 6px 10px; color: #666; border-bottom: 1px solid #f0f0f0;">Телефон</td><td style="padding: 6px 10px; border-bottom: 1px solid #f0f0f0;">${esc(orderData.phone)}</td></tr>
        </tbody>
      </table>

      <h3 style="color: #333; margin: 0 0 10px 0; font-size: 16px;">Пункт выдачи СДЭК (ПВЗ)</h3>
      <table style="width: 100%; border-collapse: collapse; font-size: 14px; margin-bottom: 20px;">
        <tbody>
          <tr><td style="padding: 6px 10px; border-bottom: 1px solid #f0f0f0;">${esc(orderData.cdekAddress)}</td></tr>
        </tbody>
      </table>

      <h3 style="color: #333; margin: 0 0 10px 0; font-size: 16px;">Данные для таможенного оформления</h3>
      <table style="width: 100%; border-collapse: collapse; font-size: 14px; margin-bottom: 20px;">
        <tbody>
          <tr><td style="padding: 6px 10px; width: 200px; color: #666; border-bottom: 1px solid #f0f0f0;">ИНН</td><td style="padding: 6px 10px; border-bottom: 1px solid #f0f0f0;">${esc(orderData.inn)}</td></tr>
          <tr><td style="padding: 6px 10px; color: #666; border-bottom: 1px solid #f0f0f0;">Серия паспорта</td><td style="padding: 6px 10px; border-bottom: 1px solid #f0f0f0;">${esc(orderData.passportSeries)}</td></tr>
          <tr><td style="padding: 6px 10px; color: #666; border-bottom: 1px solid #f0f0f0;">Номер паспорта</td><td style="padding: 6px 10px; border-bottom: 1px solid #f0f0f0;">${esc(orderData.passportNumber)}</td></tr>
          <tr><td style="padding: 6px 10px; color: #666; border-bottom: 1px solid #f0f0f0;">Дата выдачи паспорта</td><td style="padding: 6px 10px; border-bottom: 1px solid #f0f0f0;">${esc(orderData.passportIssueDate)}</td></tr>
          <tr><td style="padding: 6px 10px; color: #666; border-bottom: 1px solid #f0f0f0;">Кем выдан паспорт</td><td style="padding: 6px 10px; border-bottom: 1px solid #f0f0f0;">${esc(orderData.passportIssuedBy)}</td></tr>
        </tbody>
      </table>

      <h3 style="color: #333; margin: 0 0 10px 0; font-size: 16px;">Состав заказа</h3>
      <table style="width: 100%; border-collapse: collapse; font-size: 14px; margin-bottom: 8px;">
        <thead>
          <tr style="background: #f5f5f5;">
            <th style="padding: 8px 10px; text-align: left; border-bottom: 2px solid #ddd;">Товар</th>
            <th style="padding: 8px 10px; text-align: center; border-bottom: 2px solid #ddd;">Цвет</th>
            <th style="padding: 8px 10px; text-align: center; border-bottom: 2px solid #ddd;">Кол-во</th>
            <th style="padding: 8px 10px; text-align: right; border-bottom: 2px solid #ddd;">Цена</th>
            <th style="padding: 8px 10px; text-align: right; border-bottom: 2px solid #ddd;">Сумма</th>
          </tr>
        </thead>
        <tbody>${itemsRows}</tbody>
        <tfoot>
          <tr>
            <td colspan="4" style="padding: 8px 10px; text-align: right; border-top: 2px solid #ddd;">Товары:</td>
            <td style="padding: 8px 10px; text-align: right; border-top: 2px solid #ddd;">${formatRub(itemsTotal)} ₽</td>
          </tr>
          <tr>
            <td colspan="4" style="padding: 4px 10px; text-align: right; color: #555;">Доставка:</td>
            <td style="padding: 4px 10px; text-align: right;">${formatRub(orderData.shippingCost)} ₽</td>
          </tr>
          ${
            (orderData.promoDiscount ?? 0) > 0
              ? `<tr>
            <td colspan="4" style="padding: 4px 10px; text-align: right; color: #c0392b;">Скидка по промокоду:</td>
            <td style="padding: 4px 10px; text-align: right; color: #c0392b;">−${formatRub(orderData.promoDiscount!)} ₽</td>
          </tr>`
              : ""
          }
          <tr>
            <td colspan="4" style="padding: 8px 10px; text-align: right; font-weight: bold; border-top: 1px solid #ddd;">Итого к оплате:</td>
            <td style="padding: 8px 10px; text-align: right; font-weight: bold; border-top: 1px solid #ddd;">${formatRub(orderData.totalAmount)} ₽</td>
          </tr>
        </tfoot>
      </table>

      ${commissionRows}

      <p style="margin-top: 24px;">
        <a href="${orderLink}" style="display: inline-block; padding: 10px 20px; background-color: #A13D42; color: white; text-decoration: none; border-radius: 5px;">Просмотреть заказ #${esc(orderNumber)}</a>
      </p>
      <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
      ${EMAIL_FOOTER}
    </div>
  `;

  const result = await sendEmailViaMailopost(
    ADMIN_EMAIL,
    `Новый заказ #${orderNumber}`,
    html
  );

  return result.success;
}

/**
 * Отправка уведомления админу о новом сообщении с формы обратной связи
 */
export async function sendFeedbackNotificationToAdmin(data: {
  name: string;
  contact: string;
  comment: string;
}): Promise<boolean> {
  if (!ADMIN_EMAIL) {
    if (!IS_PRODUCTION) console.warn("ADMIN_EMAIL не настроен");
    return true;
  }
  const name = esc(data.name);
  const contact = esc(data.contact);
  const comment = esc(data.comment).replace(/\n/g, "<br>");
  const baseUrl = SITE_URL;
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #333;">Новое сообщение с формы обратной связи</h2>
      <p><strong>Имя:</strong> ${name}</p>
      <p><strong>Контакт:</strong> ${contact}</p>
      <p><strong>Сообщение:</strong></p>
      <p style="background: #f5f5f5; padding: 12px; border-radius: 6px;">${comment}</p>
      <p><a href="${baseUrl}/admin/feedback" style="display: inline-block; margin-top: 16px; padding: 10px 20px; background-color: #A13D42; color: white; text-decoration: none; border-radius: 5px;">Открыть заявки в админке</a></p>
      <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
      ${EMAIL_FOOTER}
    </div>
  `;
  const result = await sendEmailViaMailopost(
    ADMIN_EMAIL,
    "Новое сообщение с формы обратной связи — Мира Брендс | Буркер",
    html
  );
  return result.success;
}

/**
 * Отправка кода для восстановления пароля
 * В режиме разработки код выводится в консоль
 */
export async function sendPasswordResetCode(
  email: string,
  code: string
): Promise<boolean> {
  if (!IS_PRODUCTION) {
    console.log("🔐 Код восстановления пароля:", email, "→", code);
  }

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #333;">Восстановление пароля</h2>
      <p>Здравствуйте!</p>
      <p>Для восстановления пароля используйте следующий код:</p>
      <div style="background-color: #f5f5f5; padding: 20px; text-align: center; margin: 20px 0;">
        <h1 style="color: #A13D42; font-size: 32px; letter-spacing: 5px; margin: 0;">${code}</h1>
      </div>
      <p>Код действителен в течение 15 минут.</p>
      <p>Если вы не запрашивали восстановление пароля, просто проигнорируйте это письмо.</p>
      <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
      ${EMAIL_FOOTER}
    </div>
  `;

  const result = await sendEmailViaMailopost(
    email,
    "Восстановление пароля",
    html
  );

  return result.success;
}

/**
 * Отправка уведомления о выкупе товара
 */
export async function sendOrderPurchasedEmail(
  email: string,
  orderNumber: string,
  firstName: string,
  proofImageUrl: string
): Promise<boolean> {
  if (!IS_PRODUCTION) {
    console.log("🛒 Товар выкуплен #" + orderNumber);
  }

  const siteUrl = SITE_URL;

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #333;">Ваш товар выкуплен!</h2>
      <p>Здравствуйте, ${esc(firstName)}!</p>
      <p>Рады сообщить, что товар по вашему заказу <strong>#${orderNumber}</strong> успешно выкуплен у продавца.</p>
      
      <div style="background-color: #f5f5f5; padding: 20px; margin: 20px 0; border-radius: 8px;">
        <p style="margin: 0 0 10px 0; font-weight: bold;">Подтверждение выкупа:</p>
        <img src="${siteUrl}${proofImageUrl}" alt="Подтверждение выкупа" style="max-width: 100%; border-radius: 4px;">
      </div>
      
      <p>Следующий этап — отправка товара на наш склад в Германии. Мы уведомим вас, когда товар будет отправлен.</p>
      
      <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
      ${EMAIL_FOOTER}
    </div>
  `;

  const result = await sendEmailViaMailopost(
    email,
    `Заказ #${orderNumber} - товар выкуплен`,
    html
  );

  return result.success;
}

/**
 * Отправка уведомления об отправке товара на склад в Германии
 */
export async function sendOrderInTransitToWarehouseEmail(
  email: string,
  orderNumber: string,
  firstName: string,
  trackNumber: string
): Promise<boolean> {
  if (!IS_PRODUCTION) {
    console.log("📦 В пути на склад #" + orderNumber);
  }

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #333;">Товар отправлен на склад</h2>
      <p>Здравствуйте, ${esc(firstName)}!</p>
      <p>Продавец отправил товар по вашему заказу <strong>#${orderNumber}</strong> на наш склад в Германии.</p>
      
      <div style="background-color: #f5f5f5; padding: 20px; margin: 20px 0; border-radius: 8px;">
        <p style="margin: 0 0 10px 0; font-weight: bold;">Трек-номер для отслеживания:</p>
        <p style="font-size: 18px; color: #A13D42; margin: 0; font-family: monospace;">${esc(trackNumber)}</p>
      </div>
      
      <p>Вы можете отслеживать посылку по ссылке UPS:</p>
      <ul style="padding-left: 20px;">
        <li style="margin-bottom: 10px;">
          <a href="https://www.ups.com/track?loc=en_GB&amp;track=yes&amp;trackNums=${encodeURIComponent(trackNumber)}" style="color: #A13D42;">UPS</a>
        </li>
      </ul>
      
      <p>Как только товар прибудет на наш склад и будет отправлен в Россию, мы сообщим вам новый трек-номер.</p>
      
      <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
      ${EMAIL_FOOTER}
    </div>
  `;

  const result = await sendEmailViaMailopost(
    email,
    `Заказ #${orderNumber} - товар в пути на склад`,
    html
  );

  return result.success;
}

/**
 * Отправка уведомления об отправке товара в Россию
 */
export async function sendOrderInTransitToRussiaEmail(
  email: string,
  orderNumber: string,
  firstName: string,
  trackNumber: string
): Promise<boolean> {
  if (!IS_PRODUCTION) {
    console.log("🚀 В пути в Россию #" + orderNumber);
  }

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #333;">Товар отправлен в Россию!</h2>
      <p>Здравствуйте, ${esc(firstName)}!</p>
      <p>Отличные новости! Товар по вашему заказу <strong>#${esc(orderNumber)}</strong> отправлен со склада и направляется в Россию.</p>
      
      <div style="background-color: #f5f5f5; padding: 20px; margin: 20px 0; border-radius: 8px;">
        <p style="margin: 0 0 10px 0; font-weight: bold;">Трек-номер для отслеживания:</p>
        <p style="font-size: 18px; color: #A13D42; margin: 0; font-family: monospace;">${esc(trackNumber)}</p>
      </div>
      
      <p>Вы можете отслеживать посылку по ссылке СДЭК:</p>
      <ul style="padding-left: 20px;">
        <li style="margin-bottom: 10px;">
          <a href="https://www.cdek.ru/ru/tracking?order_id=${encodeURIComponent(trackNumber)}" style="color: #A13D42;">СДЭК</a>
        </li>
      </ul>
      
      <p>Как только посылка прибудет в пункт выдачи, мы уведомим вас.</p>
      
      <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
      ${EMAIL_FOOTER}
    </div>
  `;

  const result = await sendEmailViaMailopost(
    email,
    `Заказ #${orderNumber} - товар в пути в Россию`,
    html
  );

  return result.success;
}

/**
 * Отправка уведомления о доставке заказа
 */
export async function sendOrderDeliveredEmail(
  email: string,
  orderNumber: string,
  firstName: string
): Promise<boolean> {
  if (!IS_PRODUCTION) {
    console.log("✅ Заказ доставлен #" + orderNumber);
  }

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #333;">Заказ доставлен!</h2>
      <p>Здравствуйте, ${esc(firstName)}!</p>
      <p>Ваш заказ <strong>#${orderNumber}</strong> успешно доставлен!</p>
      
      <div style="background-color: #e8f5e9; padding: 20px; margin: 20px 0; border-radius: 8px; text-align: center;">
        <p style="font-size: 48px; margin: 0;">✅</p>
        <p style="margin: 10px 0 0 0; font-weight: bold; color: #2e7d32;">Заказ передан получателю</p>
      </div>
      
      <p>Благодарим вас за покупку в нашем магазине! Надеемся, что вы останетесь довольны своим приобретением.</p>
      <p>Если у вас возникнут вопросы или проблемы с товаром, не стесняйтесь обращаться к нам.</p>
      
      <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
      ${EMAIL_FOOTER}
    </div>
  `;

  const result = await sendEmailViaMailopost(
    email,
    `Заказ #${orderNumber} доставлен`,
    html
  );

  return result.success;
}

/**
 * Отправка уведомления об оплате заказа (после вебхука T-Bank СБП)
 */
export async function sendOrderPaidEmail(
  email: string,
  orderNumber: string,
  firstName: string,
  totalAmount: number,
  items: Array<{ name: string; quantity: number; price: number }>,
  extra?: {
    shippingCost?: number;
    totalWeightKg?: number;
    promoDiscount?: number;
  }
): Promise<boolean> {
  if (!IS_PRODUCTION) {
    console.log("💳 Заказ оплачен #" + orderNumber);
  }

  const itemsList = items
    .map(
      (item) =>
        `<tr>
          <td style="padding: 10px; border-bottom: 1px solid #eee;">${esc(item.name)}</td>
          <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: center;">${item.quantity}</td>
          <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: right;">${formatRub(item.price)} ₽</td>
        </tr>`
    )
    .join("");

  const shippingCost = extra?.shippingCost ?? 0;
  const totalWeightKg = extra?.totalWeightKg;
  const promoDiscount = extra?.promoDiscount ?? 0;

  const weightPart =
    totalWeightKg != null && Number.isFinite(totalWeightKg)
      ? ` — оценочный вес заказа ${totalWeightKg.toLocaleString("ru-RU", {
          minimumFractionDigits: 1,
          maximumFractionDigits: 1,
        })} кг`
      : "";

  const shippingRow =
    shippingCost > 0 || weightPart
      ? `<tr>
          <td colspan="2" style="padding: 10px; border-bottom: 1px solid #eee; text-align: right;">Доставка до РФ${weightPart}:</td>
          <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: right;">${
            shippingCost <= 0
              ? '<span style="color: #2e7d32; font-weight: bold;">Бесплатно</span>'
              : `${formatRub(shippingCost)} ₽`
          }</td>
        </tr>`
      : "";

  const promoRow =
    promoDiscount > 0
      ? `<tr>
          <td colspan="2" style="padding: 10px; border-bottom: 1px solid #eee; text-align: right; color: #2e7d32;">Скидка по промокоду:</td>
          <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: right; color: #2e7d32; font-weight: bold;">−${formatRub(promoDiscount)} ₽</td>
        </tr>`
      : "";

  const shippingExplanation = shippingCost > 0 || weightPart ? EMAIL_SHIPPING_COST_EXPLANATION : "";

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #333;">Заказ оплачен</h2>
      <p>Здравствуйте, ${esc(firstName)}!</p>
      <p>Мы получили оплату по заказу <strong>#${orderNumber}</strong> на сумму <strong>${formatRub(totalAmount)} ₽</strong>.</p>
      
      <div style="background-color: #e8f5e9; padding: 20px; margin: 20px 0; border-radius: 8px; text-align: center;">
        <p style="font-size: 48px; margin: 0;">✅</p>
        <p style="margin: 10px 0 0 0; font-weight: bold; color: #2e7d32;">Оплата получена</p>
      </div>
      
      <h3 style="color: #333; margin-top: 30px;">Детали заказа:</h3>
      <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
        <thead>
          <tr style="background-color: #f5f5f5;">
            <th style="padding: 10px; text-align: left; border-bottom: 2px solid #ddd;">Товар</th>
            <th style="padding: 10px; text-align: center; border-bottom: 2px solid #ddd;">Количество</th>
            <th style="padding: 10px; text-align: right; border-bottom: 2px solid #ddd;">Цена</th>
          </tr>
        </thead>
        <tbody>
          ${itemsList}
          ${shippingRow}
          ${promoRow}
        </tbody>
        <tfoot>
          <tr>
            <td colspan="2" style="padding: 10px; text-align: right; font-weight: bold;">Итого:</td>
            <td style="padding: 10px; text-align: right; font-weight: bold;">${formatRub(totalAmount)} ₽</td>
          </tr>
        </tfoot>
      </table>
      ${shippingExplanation}
      
      <p>Заказ передан в обработку. Мы свяжемся с вами при изменении статуса доставки.</p>
      
      <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
      ${EMAIL_FOOTER}
    </div>
  `;

  const result = await sendEmailViaMailopost(
    email,
    `Заказ #${orderNumber} оплачен`,
    html
  );

  return result.success;
}

/**
 * Уведомление покупателю о том, что заказ не оплачен (платёж отменён, отклонён или истёк)
 */
export async function sendOrderNotPaidEmail(
  email: string,
  orderNumber: string,
  firstName: string,
  totalAmount: number
): Promise<boolean> {
  if (!IS_PRODUCTION) {
    console.log("❌ Заказ не оплачен #" + orderNumber);
  }

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #333;">Заказ не оплачен</h2>
      <p>Здравствуйте, ${esc(firstName)}!</p>
      <p>Платёж по заказу <strong>#${orderNumber}</strong> (сумма ${formatRub(totalAmount)} ₽) не был проведён.</p>
      
      <div style="background-color: #ffebee; padding: 20px; margin: 20px 0; border-radius: 8px; text-align: center;">
        <p style="margin: 0; font-weight: bold; color: #c62828;">Оплата не получена</p>
      </div>
      
      <p>Вы можете оформить новый заказ на нашем сайте или связаться с нами, если у вас возникли вопросы.</p>
      
      <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
      ${EMAIL_FOOTER}
    </div>
  `;

  const result = await sendEmailViaMailopost(
    email,
    `Заказ #${orderNumber} — оплата не проведена`,
    html
  );

  return result.success;
}

/**
 * Отправка чека (PDF) на email пользователя.
 * Вызывается после успешной фискализации в Orange Data.
 */
export async function sendReceiptPdfEmail(
  email: string,
  firstName: string,
  orderNumber: string,
  orderId: string
): Promise<boolean> {
  if (!IS_PRODUCTION) {
    console.log("🧾 Отправка чека на email #" + orderNumber);
  }

  const { generateReceiptPdf } = await import("./receipt-pdf");
  const pdfBuffer = await generateReceiptPdf(orderId);
  const filename = `check-${orderNumber}.pdf`;

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #333;">Ваш авансовый чек</h2>
      <p>Здравствуйте, ${esc(firstName)}!</p>
      <p>Во вложении — авансовый кассовый чек по заказу <strong>#${orderNumber}</strong> (PDF).</p>
      <p>Чек сформирован в соответствии с требованиями 54-ФЗ.</p>
      <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
      ${EMAIL_FOOTER}
    </div>
  `;

  const result = await sendEmailWithAttachment(
    email,
    `Авансовый чек по заказу #${orderNumber}`,
    html,
    {
    filename,
    content: pdfBuffer,
  });

  return result.success;
}

/**
 * Уведомление покупателю об отмене заказа администратором
 */
export async function sendOrderCancelledEmail(
  email: string,
  orderNumber: string,
  firstName: string,
  totalAmount: number,
  items: Array<{ name: string; quantity: number; price: number }>
): Promise<boolean> {
  if (!IS_PRODUCTION) {
    console.log("🚫 Заказ отменен администратором #" + orderNumber);
  }

  const itemsList = items
    .map(
      (item) =>
        `<tr>
          <td style="padding: 10px; border-bottom: 1px solid #eee;">${esc(item.name)}</td>
          <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: center;">${item.quantity}</td>
          <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: right;">${formatRub(item.price)} ₽</td>
        </tr>`
    )
    .join("");

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #333;">Ваш заказ был отменен</h2>
      <p>Здравствуйте, ${esc(firstName)}!</p>
      <p>Ваш заказ <strong>#${orderNumber}</strong> был отменен.</p>
      
      <div style="background-color: #fff3cd; padding: 20px; margin: 20px 0; border-radius: 8px; border-left: 4px solid #ffc107;">
        <p style="margin: 0; font-weight: bold; color: #856404;">Заказ отменен</p>
      </div>
      
      <h3 style="color: #333; margin-top: 30px;">Детализация заказа:</h3>
      <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
        <thead>
          <tr style="background-color: #f5f5f5;">
            <th style="padding: 10px; text-align: left; border-bottom: 2px solid #ddd;">Товар</th>
            <th style="padding: 10px; text-align: center; border-bottom: 2px solid #ddd;">Количество</th>
            <th style="padding: 10px; text-align: right; border-bottom: 2px solid #ddd;">Цена</th>
          </tr>
        </thead>
        <tbody>
          ${itemsList}
          <tr>
            <td colspan="2" style="padding: 10px; text-align: right; font-weight: bold; border-top: 2px solid #ddd;">Итого:</td>
            <td style="padding: 10px; text-align: right; font-weight: bold; border-top: 2px solid #ddd;">${formatRub(totalAmount)} ₽</td>
          </tr>
        </tbody>
      </table>
      
      <p style="margin-top: 30px;">По всем вопросам обращайтесь в поддержку.</p>
      
      <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
      ${EMAIL_FOOTER}
    </div>
  `;

  const result = await sendEmailViaMailopost(
    email,
    `Заказ #${orderNumber} отменен`,
    html
  );

  return result.success;
}
