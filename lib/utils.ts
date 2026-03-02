export function generateProductSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "");
}

/** Маппинг subcategory → slug для URL /collections/[slug] */
const SUBcategoryToSlug: Record<string, string> = {
  Diana: "diana",
  Sophie: "sophie",
  Olivia: "olivia",
  Macy: "macy",
  Isabell: "isabell",
  Julia: "julia",
  Ruby: "ruby",
  "Olivia Petite": "olivia-petite",
  "Macy Petite": "macy-petite",
  "Isabell Petite": "isabell-petite",
  "Ruby Petite": "ruby-petite",
  Браслеты: "bracelets",
  Ожерелье: "necklaces",
  Серьги: "earrings",
  Кольца: "rings",
};

/**
 * Возвращает breadcrumb-элементы для товара: Главная → Коллекция [→ Подкатегория] → Товар.
 */
export function getProductBreadcrumbItems(
  product: { name: string; collection: string; subcategory?: string }
): { label: string; href?: string }[] {
  const items: { label: string; href?: string }[] = [
    { label: "Главная", href: "/" },
  ];

  if (product.collection === "Часы") {
    items.push({ label: "Часы", href: "/collections/watches" });
  } else if (product.collection === "Украшения") {
    items.push({ label: "Украшения", href: "/collections/jewelry" });
  }

  if (product.subcategory) {
    const slug = SUBcategoryToSlug[product.subcategory];
    if (slug) {
      items.push({ label: product.subcategory, href: `/collections/${slug}` });
    }
  }

  items.push({ label: product.name });

  return items;
}

/** Маппинг slug коллекции → отображаемое название */
const COLLECTION_SLUG_TO_LABEL: Record<string, string> = {
  watches: "Часы",
  jewelry: "Украшения",
  ...Object.fromEntries(
    Object.entries(SUBcategoryToSlug).map(([k, v]) => [v, k])
  ),
};

/**
 * Возвращает отображаемое название коллекции по slug.
 */
export function getCollectionLabel(slug: string): string {
  return (
    COLLECTION_SLUG_TO_LABEL[slug] ||
    slug.charAt(0).toUpperCase() + slug.slice(1)
  );
}

/**
 * Возвращает breadcrumb-элементы для коллекции: Главная → Коллекция.
 */
export function getCollectionBreadcrumbItems(
  collectionSlug: string,
  collectionLabel?: string
): { label: string; href?: string }[] {
  const label = collectionLabel ?? getCollectionLabel(collectionSlug);
  return [
    { label: "Главная", href: "/" },
    { label },
  ];
}
