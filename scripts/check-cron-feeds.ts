#!/usr/bin/env npx tsx
/**
 * Проверка парсинга/подгрузки: импорт товаров и курсы ЦБ РФ.
 * Запуск: npx tsx scripts/check-cron-feeds.ts
 */

import "./load-env";
import { fetchCbrRates } from "../lib/cbr-rates";
import { transformJsonProduct } from "../lib/import/transform";
import { validateProducts } from "../lib/import/validate";
import { getImportJsonFeedUrl } from "../lib/import/feed-url";

async function checkCbrRates() {
  console.log("\n=== 1. Курсы ЦБ РФ ===\n");
  try {
    const { eurRate, rubRate } = await fetchCbrRates();
    console.log("✓ Курсы загружены:");
    console.log(`  rubRate (руб/USD): ${rubRate.toFixed(4)}`);
    console.log(`  eurRate (коэф.):   ${eurRate.toFixed(4)}`);
    return true;
  } catch (error) {
    console.error("❌ Ошибка ЦБ:", error instanceof Error ? error.message : error);
    return false;
  }
}

async function checkImport() {
  console.log("\n=== 2. Импорт товаров (парсинг) ===\n");
  try {
    const apiKey = process.env.API_JSON_KEY;
    if (!apiKey) {
      throw new Error("API_JSON_KEY не задан в .env");
    }
    const res = await fetch(getImportJsonFeedUrl(), {
      headers: {
        Accept: "application/json",
        "X-API-KEY": apiKey,
      },
      signal: AbortSignal.timeout(30000),
    });
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }

    const data = await res.json();
    if (!Array.isArray(data)) {
      throw new Error(`Ответ не массив, тип: ${typeof data}`);
    }

    console.log(`✓ Получено товаров: ${data.length}`);

    const validation = validateProducts(data);
    if (!validation.isValid) {
      console.log(`⚠ Валидация: ${validation.errors.length} предупреждений`);
      validation.errors.slice(0, 5).forEach((e) => console.log(`   - ${e.id}: ${e.message}`));
      if (validation.errors.length > 5) {
        console.log(`   ... и ещё ${validation.errors.length - 5}`);
      }
    } else {
      console.log("✓ Валидация пройдена");
    }

    const critical = validation.errors.filter((e) => e.field === "id" || e.field === "url");
    if (critical.length > 0) {
      console.error("❌ Критические ошибки (id/url):");
      critical.forEach((e) => console.error(`   - ${e.id}: ${e.message}`));
      return false;
    }

    const sample = data[0];
    if (sample) {
      const transformed = transformJsonProduct(sample);
      console.log("✓ Парсинг пробного товара:", transformed.name, `(id=${transformed.id})`);
    }

    return true;
  } catch (error) {
    console.error("❌ Ошибка импорта:", error instanceof Error ? error.message : error);
    return false;
  }
}

async function main() {
  console.log("Проверка источников данных для cron...");

  const cbrOk = await checkCbrRates();
  const importOk = await checkImport();

  console.log("\n=== Итог ===");
  console.log(`Курсы ЦБ: ${cbrOk ? "✓ OK" : "❌ Ошибка"}`);
  console.log(`Импорт:   ${importOk ? "✓ OK" : "❌ Ошибка"}`);

  if (!cbrOk || !importOk) {
    process.exit(1);
  }
}

main();
