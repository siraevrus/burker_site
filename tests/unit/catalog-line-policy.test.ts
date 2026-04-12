import { describe, it, expect } from "vitest";
import { isCatalogSlugEditable } from "@/lib/catalog-line-policy";

describe("isCatalogSlugEditable", () => {
  it("true пока линия не опубликована", () => {
    expect(isCatalogSlugEditable(null)).toBe(true);
    expect(isCatalogSlugEditable(undefined)).toBe(true);
  });

  it("false после публикации", () => {
    expect(isCatalogSlugEditable(new Date())).toBe(false);
  });
});
