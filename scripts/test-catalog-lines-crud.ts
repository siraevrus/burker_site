/**
 * Проверка CatalogLine + loadCatalogMapsFromDatabase на текущей БД (DATABASE_URL).
 * Запуск: npx tsx scripts/test-catalog-lines-crud.ts
 */
import "dotenv/config";
import { prisma } from "../lib/db";
import { loadCatalogMapsFromDatabase } from "../lib/catalog-lines";

function fail(msg: string): never {
  console.error("FAIL:", msg);
  process.exit(1);
}

async function main() {
  const suffix = `t${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
  const subcategory = `__TestLine ${suffix}`;
  const slug = `test-line-${suffix}`;

  let createdId: string | null = null;

  try {
    const before = await loadCatalogMapsFromDatabase();
    if (before.subToSlug[subcategory]) {
      fail(`случайный subcategory уже занят: ${subcategory}`);
    }

    const created = await prisma.catalogLine.create({
      data: {
        kind: "watches",
        subcategory,
        slug,
        sortOrder: 9999,
        enabled: true,
        showOnHome: false,
        publishedAt: null,
      },
    });
    createdId = created.id;

    const afterCreate = await loadCatalogMapsFromDatabase();
    if (afterCreate.subToSlug[subcategory] !== slug) {
      fail(`после create ожидался slug ${slug}, got ${afterCreate.subToSlug[subcategory]}`);
    }
    if (afterCreate.slugToSub[slug.toLowerCase()] !== subcategory) {
      fail("обратный индекс slug→subcategory неверен");
    }

    const slug2 = `${slug}-v2`;
    await prisma.catalogLine.update({
      where: { id: created.id },
      data: { slug: slug2 },
    });

    const afterSlug = await loadCatalogMapsFromDatabase();
    if (afterSlug.subToSlug[subcategory] !== slug2) {
      fail("после смены slug карта не обновилась");
    }
    if (afterSlug.slugToSub[slug.toLowerCase()]) {
      fail("старый slug должен исчезнуть из slugToSub");
    }

    await prisma.catalogLine.delete({ where: { id: created.id } });
    createdId = null;

    const afterDelete = await loadCatalogMapsFromDatabase();
    if (afterDelete.subToSlug[subcategory]) {
      fail("после delete подкатегория всё ещё в карте");
    }

    console.log("OK: create → карта → смена slug → delete → карта без тестовой линии");
  } catch (e) {
    console.error(e);
    process.exit(1);
  } finally {
    if (createdId) {
      await prisma.catalogLine.delete({ where: { id: createdId } }).catch(() => {});
    }
    await prisma.$disconnect();
  }
}

main();
