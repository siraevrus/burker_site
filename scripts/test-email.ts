import "./load-env";
import { sendEmailViaMailopost } from "../lib/mailopost";

async function testEmail() {
  const testEmail = "ruslan@siraev.ru";
  
  console.log("Отправка тестового письма...");
  console.log(`Получатель: ${testEmail}`);
  console.log(`API Token настроен: ${process.env.MAILOPOST_API_TOKEN ? "Да" : "Нет"}`);
  console.log(`From Email: ${process.env.MAILOPOST_FROM_EMAIL || "не настроен"}`);
  
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <h2 style="color: #333;">Тестовое письмо от Mira Brands | Burker</h2>
      <p>Здравствуйте!</p>
      <p>Это тестовое письмо для проверки работы Mailopost API.</p>
      <p>Если вы получили это письмо, значит интеграция работает корректно! ✅</p>
      <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
      <p style="color: #999; font-size: 12px;"><a href="${process.env.NEXT_PUBLIC_SITE_URL || process.env.SITE_URL || "https://burker-watches.ru"}" style="color: #999; text-decoration: none;">Mira Brands | Burker</a></p>
      <p style="color: #999; font-size: 12px;">Время отправки: ${new Date().toLocaleString('ru-RU')}</p>
    </div>
  `;

  const result = await sendEmailViaMailopost(
    testEmail,
    "Тестовое письмо от Mira Brands | Burker",
    html
  );

  if (result.success) {
    console.log("\n✅ Письмо успешно отправлено!");
    if (result.messageId) {
      console.log(`📧 ID сообщения: ${result.messageId}`);
    }
  } else {
    console.error("\n❌ Ошибка при отправке письма:");
    console.error(`Ошибка: ${result.error}`);
  }
}

testEmail().catch(console.error);
