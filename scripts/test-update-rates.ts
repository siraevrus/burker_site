#!/usr/bin/env npx tsx
/**
 * Тестирование эндпоинта обновления курсов валют
 * Запуск: npx tsx scripts/test-update-rates.ts [TOKEN]
 */

import "./load-env";

const API_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://burker-watches.ru";
const TOKEN = process.argv[2] || process.env.CRON_SECRET || "";

async function testUpdateRates() {
  console.log(`\n=== Тест эндпоинта /api/cron/update-rates ===\n`);
  console.log(`URL: ${API_URL}/api/cron/update-rates`);
  console.log(`Token: ${TOKEN ? TOKEN.substring(0, 10) + "..." : "НЕ УСТАНОВЛЕН"}`);
  console.log(`Expected CRON_SECRET: ${process.env.CRON_SECRET || process.env.CRON_SECRET_KEY || "НЕ УСТАНОВЛЕН"}\n`);

  try {
    const response = await fetch(`${API_URL}/api/cron/update-rates`, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${TOKEN}`,
      },
    });

    const status = response.status;
    const contentType = response.headers.get("content-type");
    let body: any;

    if (contentType?.includes("application/json")) {
      body = await response.json();
    } else {
      body = await response.text();
    }

    console.log(`Статус: ${status} ${status === 200 ? "✓" : status === 401 ? "❌ Неавторизован" : "❌ Ошибка"}`);
    console.log(`Ответ:`, JSON.stringify(body, null, 2));

    if (status === 401) {
      console.log(`\n⚠️  Проблема с авторизацией!`);
      console.log(`   Проверьте, что токен в cron совпадает с CRON_SECRET в переменных окружения.`);
      if (process.env.CRON_SECRET || process.env.CRON_SECRET_KEY) {
        const expected = process.env.CRON_SECRET || process.env.CRON_SECRET_KEY;
        console.log(`   Ожидается: ${expected}`);
        console.log(`   Получено:   ${TOKEN}`);
        console.log(`   Совпадают:  ${expected === TOKEN ? "✓ ДА" : "❌ НЕТ"}`);
      }
    } else if (status === 200) {
      console.log(`\n✓ Успешно! Курсы обновлены.`);
      if (body.rates) {
        console.log(`   EUR: ${body.rates.eurRate?.toFixed(4)}`);
        console.log(`   RUB: ${body.rates.rubRate?.toFixed(4)}`);
      }
    }

    process.exit(status === 200 ? 0 : 1);
  } catch (error) {
    console.error("❌ Ошибка при запросе:", error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

testUpdateRates();
