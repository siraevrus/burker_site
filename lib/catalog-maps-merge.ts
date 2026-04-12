import type { CatalogMaps } from "@/lib/catalog-maps";
import { LEGACY_SUBCATEGORY_TO_SLUG } from "@/lib/legacy-subcategory-slugs";

export function buildMapsFromLegacy(): CatalogMaps {
  const subToSlug = { ...LEGACY_SUBCATEGORY_TO_SLUG };
  const slugToSub: Record<string, string> = {};
  for (const [sub, slug] of Object.entries(subToSlug)) {
    slugToSub[slug.toLowerCase()] = sub;
  }
  return { subToSlug, slugToSub };
}

/** Строки из БД переопределяют LEGACY и обновляют обратный индекс slug → subcategory. */
export function mergeRowsIntoMaps(
  base: CatalogMaps,
  rows: { subcategory: string; slug: string }[]
): CatalogMaps {
  const subToSlug = { ...base.subToSlug };
  const slugToSub = { ...base.slugToSub };
  for (const r of rows) {
    const oldSlug = subToSlug[r.subcategory];
    if (oldSlug) {
      delete slugToSub[oldSlug.toLowerCase()];
    }
    subToSlug[r.subcategory] = r.slug;
    slugToSub[r.slug.toLowerCase()] = r.subcategory;
  }
  return { subToSlug, slugToSub };
}

/** Базовое имя коллекции для главной (как в импорте: без «Petite»). */
export function collectionKeyFromSubcategory(subcategory: string): string {
  return subcategory.replace(/\s+Petite\s*$/i, "").trim() || subcategory;
}
