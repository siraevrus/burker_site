#!/usr/bin/env npx tsx
/**
 * Тестирование эндпоинта импорта товаров через cron
 * Запуск: npx tsx scripts/test-import.ts [TOKEN]
 */

import "./load-env";

const API_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://burker-watches.ru";
const TOKEN = process.argv[2] || process.env.CRON_SECRET || "";

async function testImport() {
  console.log(`\n=== Тест эндпоинта /api/cron/import ===\n`);
  console.log(`URL: ${API_URL}/api/cron/import`);
  console.log(`Token: ${TOKEN ? TOKEN.substring(0, 10) + "..." : "НЕ УСТАНОВЛЕН"}`);
  console.log(`Expected CRON_SECRET: ${process.env.CRON_SECRET || process.env.CRON_SECRET_KEY || "НЕ УСТАНОВЛЕН"}\n`);

  try {
    const startTime = Date.now();
    const response = await fetch(`${API_URL}/api/cron/import`, {
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

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);

    console.log(`Статус: ${status} ${status === 200 ? "✓" : status === 401 ? "❌ Неавторизован" : "❌ Ошибка"}`);
    console.log(`Время выполнения: ${duration} сек`);
    
    if (status === 401) {
      console.log(`\n⚠️  Проблема с авторизацией!`);
      console.log(`   Проверьте, что токен в cron совпадает с CRON_SECRET в переменных окружения.`);
      if (process.env.CRON_SECRET || process.env.CRON_SECRET_KEY) {
        const expected = process.env.CRON_SECRET || process.env.CRON_SECRET_KEY;
        console.log(`   Ожидается: ${expected}`);
        console.log(`   Получено:   ${TOKEN}`);
        console.log(`   Совпадают:  ${expected === TOKEN ? "✓ ДА" : "❌ НЕТ"}`);
      }
      process.exit(1);
    } else if (status === 200) {
      console.log(`\n✓ Успешно! Импорт выполнен.`);
      if (body.result) {
        console.log(`   Всего товаров: ${body.result.total || "N/A"}`);
        console.log(`   Добавлено: ${body.result.added || 0}`);
        console.log(`   Обновлено: ${body.result.updated || 0}`);
        console.log(`   Ошибок: ${body.result.errors?.length || 0}`);
      }
      if (body.timestamp) {
        console.log(`   Время: ${body.timestamp}`);
      }
    } else {
      console.log(`\n❌ Ошибка:`);
      console.log(JSON.stringify(body, null, 2));
      process.exit(1);
    }

    process.exit(0);
  } catch (error) {
    console.error("❌ Ошибка при запросе:", error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

testImport();
