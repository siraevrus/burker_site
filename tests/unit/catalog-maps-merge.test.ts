import { describe, it, expect } from "vitest";
import {
  buildMapsFromLegacy,
  mergeRowsIntoMaps,
  collectionKeyFromSubcategory,
} from "@/lib/catalog-maps-merge";
import { LEGACY_SUBCATEGORY_TO_SLUG } from "@/lib/legacy-subcategory-slugs";

describe("buildMapsFromLegacy", () => {
  it("содержит известные линии и обратный индекс по slug", () => {
    const m = buildMapsFromLegacy();
    expect(m.subToSlug.Macy).toBe("macy");
    expect(m.slugToSub.macy).toBe("Macy");
    expect(m.slugToSub["macy-petite"]).toBe("Macy Petite");
  });

  it("совпадает с LEGACY по ключам subcategory", () => {
    const m = buildMapsFromLegacy();
    for (const k of Object.keys(LEGACY_SUBCATEGORY_TO_SLUG)) {
      expect(m.subToSlug[k]).toBe(LEGACY_SUBCATEGORY_TO_SLUG[k]);
    }
  });
});

describe("mergeRowsIntoMaps", () => {
  it("переопределяет slug для существующей подкатегории", () => {
    const base = buildMapsFromLegacy();
    const merged = mergeRowsIntoMaps(base, [
      { subcategory: "Macy", slug: "macy-custom" },
    ]);
    expect(merged.subToSlug.Macy).toBe("macy-custom");
    expect(merged.slugToSub["macy-custom"]).toBe("Macy");
    expect(merged.slugToSub.macy).toBeUndefined();
  });

  it("добавляет новую линию, отсутствующую в LEGACY", () => {
    const base = buildMapsFromLegacy();
    const merged = mergeRowsIntoMaps(base, [
      { subcategory: "NewBrand X", slug: "new-brand-x" },
    ]);
    expect(merged.subToSlug["NewBrand X"]).toBe("new-brand-x");
    expect(merged.slugToSub["new-brand-x"]).toBe("NewBrand X");
  });

  it("не дублирует slugToSub при нескольких строках", () => {
    const base = buildMapsFromLegacy();
    const merged = mergeRowsIntoMaps(base, [
      { subcategory: "A", slug: "line-a" },
      { subcategory: "B", slug: "line-b" },
    ]);
    expect(Object.keys(merged.slugToSub).filter((k) => k.startsWith("line-"))).toHaveLength(2);
  });
});

describe("collectionKeyFromSubcategory", () => {
  it("убирает Petite в конце", () => {
    expect(collectionKeyFromSubcategory("Macy Petite")).toBe("Macy");
    expect(collectionKeyFromSubcategory("Victoria")).toBe("Victoria");
  });
});
