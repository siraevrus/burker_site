/** Маппинги subcategory ↔ URL-slug для товарных путей (источник — БД CatalogLine + запасной LEGACY). */
export type CatalogMaps = {
  subToSlug: Record<string, string>;
  slugToSub: Record<string, string>;
};
