import { sendEmailViaMailopost, sendEmailWithAttachment } from "./mailopost";

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
 * Отправка уведомления о новом заказе пользователю
 */
export async function sendOrderConfirmation(
  email: string,
  orderNumber: string,
  orderData: {
    firstName: string;
    totalAmount: number;
    items: Array<{ name: string; quantity: number; price: number }>;
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
          <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: right;">${item.price.toFixed(0)} ₽</td>
        </tr>`
    )
    .join("");

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
        </tbody>
        <tfoot>
          <tr>
            <td colspan="2" style="padding: 10px; text-align: right; font-weight: bold;">Итого:</td>
            <td style="padding: 10px; text-align: right; font-weight: bold;">${orderData.totalAmount.toFixed(0)} ₽</td>
          </tr>
        </tfoot>
      </table>
      
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
 * Отправка уведомления админу о новом заказе
 */
export async function sendAdminOrderNotification(
  orderNumber: string,
  orderId: string,
  orderData: {
    email: string;
    firstName: string;
    phone: string;
    address: string;
    totalAmount: number;
    itemsCount: number;
  }
): Promise<boolean> {
  if (!IS_PRODUCTION) {
    console.log("🔔 Уведомление админу о заказе #" + orderNumber);
  }

  if (!ADMIN_EMAIL) {
    console.warn("ADMIN_EMAIL не настроен, уведомление админу не отправлено");
    return true;
  }

  const orderLink = `${SITE_URL}/admin/orders/${orderId}`;
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #333;">Новый заказ #${esc(orderNumber)}</h2>
      <p><strong>Email:</strong> ${esc(orderData.email)}</p>
      <p><strong>Имя:</strong> ${esc(orderData.firstName)}</p>
      <p><strong>Телефон:</strong> ${esc(orderData.phone)}</p>
      <p><strong>Адрес:</strong> ${esc(orderData.address)}</p>
      <p><strong>Количество товаров:</strong> ${orderData.itemsCount}</p>
      <p><strong>Сумма заказа:</strong> ${orderData.totalAmount.toFixed(0)} ₽</p>
      <p><strong>Ссылка на заказ:</strong> <a href="${orderLink}">${orderLink}</a></p>
      <p><a href="${orderLink}" style="display: inline-block; margin-top: 20px; padding: 10px 20px; background-color: #A13D42; color: white; text-decoration: none; border-radius: 5px;">Просмотреть заказ #${orderNumber}</a></p>
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
      
      <p>Вы можете отслеживать посылку по следующим ссылкам:</p>
      <ul style="padding-left: 20px;">
        <li style="margin-bottom: 10px;">
          <a href="https://www.dhl.de/en/privatkunden/pakete-empfangen/verfolgen.html?piececode=${encodeURIComponent(trackNumber)}" style="color: #A13D42;">DHL</a>
        </li>
        <li style="margin-bottom: 10px;">
          <a href="https://t.17track.net/en#nums=${encodeURIComponent(trackNumber)}" style="color: #A13D42;">17track</a>
        </li>
        <li style="margin-bottom: 10px;">
          <a href="https://parcelsapp.com/en/tracking/${encodeURIComponent(trackNumber)}" style="color: #A13D42;">Parcels App</a>
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
      
      <p>Вы можете отслеживать посылку по следующим ссылкам:</p>
      <ul style="padding-left: 20px;">
        <li style="margin-bottom: 10px;">
          <a href="https://www.cdek.ru/ru/tracking?order_id=${encodeURIComponent(trackNumber)}" style="color: #A13D42;">СДЭК</a>
        </li>
        <li style="margin-bottom: 10px;">
          <a href="https://t.17track.net/en#nums=${encodeURIComponent(trackNumber)}" style="color: #A13D42;">17track</a>
        </li>
        <li style="margin-bottom: 10px;">
          <a href="https://parcelsapp.com/en/tracking/${encodeURIComponent(trackNumber)}" style="color: #A13D42;">Parcels App</a>
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
  items: Array<{ name: string; quantity: number; price: number }>
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
          <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: right;">${item.price.toFixed(0)} ₽</td>
        </tr>`
    )
    .join("");

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #333;">Заказ оплачен</h2>
      <p>Здравствуйте, ${esc(firstName)}!</p>
      <p>Мы получили оплату по заказу <strong>#${orderNumber}</strong> на сумму <strong>${totalAmount.toFixed(0)} ₽</strong>.</p>
      
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
        </tbody>
        <tfoot>
          <tr>
            <td colspan="2" style="padding: 10px; text-align: right; font-weight: bold;">Итого:</td>
            <td style="padding: 10px; text-align: right; font-weight: bold;">${totalAmount.toFixed(0)} ₽</td>
          </tr>
        </tfoot>
      </table>
      
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
      <p>Платёж по заказу <strong>#${orderNumber}</strong> (сумма ${totalAmount.toFixed(0)} ₽) не был проведён.</p>
      
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
      <h2 style="color: #333;">Ваш кассовый чек</h2>
      <p>Здравствуйте, ${esc(firstName)}!</p>
      <p>Во вложении — кассовый чек по заказу <strong>#${orderNumber}</strong>.</p>
      <p>Чек сформирован в соответствии с требованиями 54-ФЗ.</p>
      <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
      ${EMAIL_FOOTER}
    </div>
  `;

  const result = await sendEmailWithAttachment(email, `Чек по заказу #${orderNumber}`, html, {
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
          <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: right;">${item.price.toFixed(0)} ₽</td>
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
            <td style="padding: 10px; text-align: right; font-weight: bold; border-top: 2px solid #ddd;">${totalAmount.toFixed(0)} ₽</td>
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
