#!/usr/bin/env npx tsx
/**
 * Диагностика бестселлеров: сколько в БД, проходят ли фильтр generateProductPath.
 * Запуск: npx tsx scripts/check-bestsellers.ts
 */

import "./load-env";
import { prisma } from "../lib/db";
import { SUBcategoryToSlug } from "../lib/utils";

async function main() {
  console.log("\n=== Диагностика бестселлеров ===\n");

  // Все товары с bestseller=true
  const allBestsellers = await prisma.product.findMany({
    where: { bestseller: true },
    select: {
      id: true,
      name: true,
      collection: true,
      subcategory: true,
      disabled: true,
      soldOut: true,
    },
  });

  console.log(`Всего с bestseller=true: ${allBestsellers.length}`);

  // Как в getBestsellers (условия для главной)
  const eligible = allBestsellers.filter(
    (p) =>
      !p.disabled &&
      !p.soldOut &&
      p.subcategory != null &&
      p.subcategory.trim() !== ""
  );
  console.log(
    `Подходят под getBestsellers (не disabled, не soldOut, есть subcategory): ${eligible.length}`
  );

  // Проходят generateProductPath (subcategory в маппинге)
  const withPath = eligible.filter((p) => {
    const sub = p.subcategory!;
    return sub in SUBcategoryToSlug;
  });
  console.log(
    `С валидным путём (subcategory в SUBcategoryToSlug): ${withPath.length}`
  );

  if (allBestsellers.length > 0 && withPath.length === 0) {
    console.log("\n⚠ Возможные причины:");
    const subs = [...new Set(allBestsellers.map((p) => p.subcategory).filter(Boolean))];
    console.log(
      `  - subcategory в БД: ${subs.join(", ")}`
    );
    console.log(
      `  - Ожидаемые значения: ${Object.keys(SUBcategoryToSlug).join(", ")}`
    );
  }

  if (allBestsellers.length === 0) {
    console.log(
      "\n⚠ Нет товаров с bestseller=true. Отметьте товары как бестселлеры в админке."
    );
  }

  if (withPath.length > 0) {
    console.log("\nПримеры (первые 3):");
    withPath.slice(0, 3).forEach((p) => {
      console.log(`  - ${p.name} (id=${p.id}, subcategory=${p.subcategory})`);
    });
  }

  console.log("");
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
