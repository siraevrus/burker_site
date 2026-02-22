import { sendEmailViaMailopost } from "./mailopost";

// Конфигурация из переменных окружения
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || process.env.MAILOPOST_FROM_EMAIL || "";

/**
 * Отправка кода верификации на email
 * В режиме разработки код выводится в консоль и доступен через API
 */
export async function sendVerificationCode(
  email: string,
  code: string
): Promise<boolean> {
  // Выводим код в консоль для удобства разработки
  console.log("\n" + "=".repeat(60));
  console.log("📧 КОД ВЕРИФИКАЦИИ EMAIL");
  console.log("=".repeat(60));
  console.log(`Email: ${email}`);
  console.log(`Код: ${code}`);
  console.log("=".repeat(60) + "\n");

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
          <p style="color: #999; font-size: 12px;">Mira Brands | Burker - Официальный магазин</p>
    </div>
  `;

  const result = await sendEmailViaMailopost(
    email,
    "Код подтверждения email",
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
  console.log("\n" + "=".repeat(60));
  console.log("📦 ПОДТВЕРЖДЕНИЕ ЗАКАЗА");
  console.log("=".repeat(60));
  console.log(`Заказ #${orderNumber}`);
  console.log(`Email: ${email}`);
  console.log(`Имя: ${orderData.firstName}`);
  console.log(`Сумма: ${orderData.totalAmount.toFixed(0)} ₽`);
  console.log(`Товаров: ${orderData.items.length}`);
  console.log("=".repeat(60) + "\n");

  const itemsList = orderData.items
    .map(
      (item) =>
        `<tr>
          <td style="padding: 10px; border-bottom: 1px solid #eee;">${item.name}</td>
          <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: center;">${item.quantity}</td>
          <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: right;">${item.price.toFixed(0)} ₽</td>
        </tr>`
    )
    .join("");

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #333;">Спасибо за ваш заказ!</h2>
      <p>Здравствуйте, ${orderData.firstName}!</p>
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
          <p style="color: #999; font-size: 12px;">Mira Brands | Burker - Официальный магазин</p>
    </div>
  `;

  const result = await sendEmailViaMailopost(
    email,
    `Заказ #${orderNumber} принят`,
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
  console.log("\n" + "=".repeat(60));
  console.log("🔔 УВЕДОМЛЕНИЕ АДМИНУ О НОВОМ ЗАКАЗЕ");
  console.log("=".repeat(60));
  console.log(`Заказ #${orderNumber}`);
  console.log(`Email: ${orderData.email}`);
  console.log(`Имя: ${orderData.firstName}`);
  console.log(`Телефон: ${orderData.phone}`);
  console.log(`Адрес: ${orderData.address}`);
  console.log(`Товаров: ${orderData.itemsCount}`);
  console.log(`Сумма: ${orderData.totalAmount.toFixed(0)} ₽`);
  console.log("=".repeat(60) + "\n");

  if (!ADMIN_EMAIL) {
    console.warn("ADMIN_EMAIL не настроен, уведомление админу не отправлено");
    return true;
  }

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #333;">Новый заказ #${orderNumber}</h2>
      <p><strong>Email:</strong> ${orderData.email}</p>
      <p><strong>Имя:</strong> ${orderData.firstName}</p>
      <p><strong>Телефон:</strong> ${orderData.phone}</p>
      <p><strong>Адрес:</strong> ${orderData.address}</p>
      <p><strong>Количество товаров:</strong> ${orderData.itemsCount}</p>
      <p><strong>Сумма заказа:</strong> ${orderData.totalAmount.toFixed(0)} ₽</p>
      <p><a href="${process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"}/admin/orders/${orderId}" style="display: inline-block; margin-top: 20px; padding: 10px 20px; background-color: #A13D42; color: white; text-decoration: none; border-radius: 5px;">Просмотреть заказ #${orderNumber}</a></p>
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
 * Отправка кода для восстановления пароля
 * В режиме разработки код выводится в консоль
 */
export async function sendPasswordResetCode(
  email: string,
  code: string
): Promise<boolean> {
  console.log("\n" + "=".repeat(60));
  console.log("🔐 КОД ВОССТАНОВЛЕНИЯ ПАРОЛЯ");
  console.log("=".repeat(60));
  console.log(`Email: ${email}`);
  console.log(`Код: ${code}`);
  console.log("=".repeat(60) + "\n");

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
          <p style="color: #999; font-size: 12px;">Mira Brands | Burker - Официальный магазин</p>
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
  console.log("\n" + "=".repeat(60));
  console.log("🛒 УВЕДОМЛЕНИЕ: ТОВАР ВЫКУПЛЕН");
  console.log("=".repeat(60));
  console.log(`Заказ #${orderNumber}`);
  console.log(`Email: ${email}`);
  console.log(`Подтверждение: ${proofImageUrl}`);
  console.log("=".repeat(60) + "\n");

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #333;">Ваш товар выкуплен!</h2>
      <p>Здравствуйте, ${firstName}!</p>
      <p>Рады сообщить, что товар по вашему заказу <strong>#${orderNumber}</strong> успешно выкуплен у продавца.</p>
      
      <div style="background-color: #f5f5f5; padding: 20px; margin: 20px 0; border-radius: 8px;">
        <p style="margin: 0 0 10px 0; font-weight: bold;">Подтверждение выкупа:</p>
        <img src="${siteUrl}${proofImageUrl}" alt="Подтверждение выкупа" style="max-width: 100%; border-radius: 4px;">
      </div>
      
      <p>Следующий этап — отправка товара на наш склад в Германии. Мы уведомим вас, когда товар будет отправлен.</p>
      
      <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
      <p style="color: #999; font-size: 12px;">Mira Brands | Burker - Официальный магазин</p>
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
  console.log("\n" + "=".repeat(60));
  console.log("📦 УВЕДОМЛЕНИЕ: В ПУТИ НА СКЛАД");
  console.log("=".repeat(60));
  console.log(`Заказ #${orderNumber}`);
  console.log(`Email: ${email}`);
  console.log(`Трек: ${trackNumber}`);
  console.log("=".repeat(60) + "\n");

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #333;">Товар отправлен на склад</h2>
      <p>Здравствуйте, ${firstName}!</p>
      <p>Продавец отправил товар по вашему заказу <strong>#${orderNumber}</strong> на наш склад в Германии.</p>
      
      <div style="background-color: #f5f5f5; padding: 20px; margin: 20px 0; border-radius: 8px;">
        <p style="margin: 0 0 10px 0; font-weight: bold;">Трек-номер для отслеживания:</p>
        <p style="font-size: 18px; color: #A13D42; margin: 0; font-family: monospace;">${trackNumber}</p>
      </div>
      
      <p>Вы можете отслеживать посылку по следующим ссылкам:</p>
      <ul style="padding-left: 20px;">
        <li style="margin-bottom: 10px;">
          <a href="https://www.dhl.de/en/privatkunden/pakete-empfangen/verfolgen.html?piececode=${trackNumber}" style="color: #A13D42;">DHL</a>
        </li>
        <li style="margin-bottom: 10px;">
          <a href="https://t.17track.net/en#nums=${trackNumber}" style="color: #A13D42;">17track</a>
        </li>
        <li style="margin-bottom: 10px;">
          <a href="https://parcelsapp.com/en/tracking/${trackNumber}" style="color: #A13D42;">Parcels App</a>
        </li>
      </ul>
      
      <p>Как только товар прибудет на наш склад и будет отправлен в Россию, мы сообщим вам новый трек-номер.</p>
      
      <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
      <p style="color: #999; font-size: 12px;">Mira Brands | Burker - Официальный магазин</p>
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
  console.log("\n" + "=".repeat(60));
  console.log("🚀 УВЕДОМЛЕНИЕ: В ПУТИ В РОССИЮ");
  console.log("=".repeat(60));
  console.log(`Заказ #${orderNumber}`);
  console.log(`Email: ${email}`);
  console.log(`Трек: ${trackNumber}`);
  console.log("=".repeat(60) + "\n");

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #333;">Товар отправлен в Россию!</h2>
      <p>Здравствуйте, ${firstName}!</p>
      <p>Отличные новости! Товар по вашему заказу <strong>#${orderNumber}</strong> отправлен со склада и направляется в Россию.</p>
      
      <div style="background-color: #f5f5f5; padding: 20px; margin: 20px 0; border-radius: 8px;">
        <p style="margin: 0 0 10px 0; font-weight: bold;">Трек-номер для отслеживания:</p>
        <p style="font-size: 18px; color: #A13D42; margin: 0; font-family: monospace;">${trackNumber}</p>
      </div>
      
      <p>Вы можете отслеживать посылку по следующим ссылкам:</p>
      <ul style="padding-left: 20px;">
        <li style="margin-bottom: 10px;">
          <a href="https://www.cdek.ru/ru/tracking?order_id=${trackNumber}" style="color: #A13D42;">СДЭК</a>
        </li>
        <li style="margin-bottom: 10px;">
          <a href="https://t.17track.net/en#nums=${trackNumber}" style="color: #A13D42;">17track</a>
        </li>
        <li style="margin-bottom: 10px;">
          <a href="https://parcelsapp.com/en/tracking/${trackNumber}" style="color: #A13D42;">Parcels App</a>
        </li>
      </ul>
      
      <p>Как только посылка прибудет в пункт выдачи, мы уведомим вас.</p>
      
      <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
      <p style="color: #999; font-size: 12px;">Mira Brands | Burker - Официальный магазин</p>
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
  console.log("\n" + "=".repeat(60));
  console.log("✅ УВЕДОМЛЕНИЕ: ЗАКАЗ ДОСТАВЛЕН");
  console.log("=".repeat(60));
  console.log(`Заказ #${orderNumber}`);
  console.log(`Email: ${email}`);
  console.log("=".repeat(60) + "\n");

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #333;">Заказ доставлен!</h2>
      <p>Здравствуйте, ${firstName}!</p>
      <p>Ваш заказ <strong>#${orderNumber}</strong> успешно доставлен!</p>
      
      <div style="background-color: #e8f5e9; padding: 20px; margin: 20px 0; border-radius: 8px; text-align: center;">
        <p style="font-size: 48px; margin: 0;">✅</p>
        <p style="margin: 10px 0 0 0; font-weight: bold; color: #2e7d32;">Заказ передан получателю</p>
      </div>
      
      <p>Благодарим вас за покупку в нашем магазине! Надеемся, что вы останетесь довольны своим приобретением.</p>
      <p>Если у вас возникнут вопросы или проблемы с товаром, не стесняйтесь обращаться к нам.</p>
      
      <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
      <p style="color: #999; font-size: 12px;">Mira Brands | Burker - Официальный магазин</p>
    </div>
  `;

  const result = await sendEmailViaMailopost(
    email,
    `Заказ #${orderNumber} доставлен`,
    html
  );

  return result.success;
}
