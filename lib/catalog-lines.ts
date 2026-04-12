import { unstable_cache } from "next/cache";
import { revalidateTag } from "next/cache";
import { prisma } from "@/lib/db";
import type { CatalogMaps } from "@/lib/catalog-maps";
import {
  buildMapsFromLegacy,
  mergeRowsIntoMaps,
  collectionKeyFromSubcategory,
} from "@/lib/catalog-maps-merge";

/** Актуальные карты без кэша Next (для проверок и скриптов). */
export async function loadCatalogMapsFromDatabase(): Promise<CatalogMaps> {
  const base = buildMapsFromLegacy();
  const rows = await prisma.catalogLine.findMany({
    select: { subcategory: true, slug: true },
  });
  if (rows.length === 0) return base;
  return mergeRowsIntoMaps(base, rows);
}

export const getCatalogMaps = unstable_cache(
  async () => loadCatalogMapsFromDatabase(),
  ["catalog-maps-v1"],
  { tags: ["catalog-lines"] }
);

export function revalidateCatalogLinesCache(): void {
  revalidateTag("catalog-lines", "default");
}

export { collectionKeyFromSubcategory };

/**
 * Коллекции для вкладок на главной: включённые линии с showOnHome, без дублей по базовой коллекции.
 */
export async function getHomeBrandCollections(): Promise<string[]> {
  const lines = await prisma.catalogLine.findMany({
    where: { kind: "watches", enabled: true, showOnHome: true },
    orderBy: { sortOrder: "asc" },
    select: { subcategory: true },
  });
  const seen = new Set<string>();
  const out: string[] = [];
  for (const { subcategory } of lines) {
    const key = collectionKeyFromSubcategory(subcategory);
    if (!seen.has(key)) {
      seen.add(key);
      out.push(key);
    }
  }
  if (out.length > 0) return out;
  return ["Macy", "Olivia", "Julia", "Isabell", "Ruby", "Victoria"];
}
