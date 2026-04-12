export function generateProductSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "");
}

/** Маппинг collection → category slug для URL /products/[category] */
export function getCategorySlug(collection: string): "watches" | "jewelry" {
  return collection === "Украшения" ? "jewelry" : "watches";
}

/** Маппинг subcategory → slug для URL (экспортируем для использования в products) */
export const SUBcategoryToSlug: Record<string, string> = {
  Diana: "diana",
  "Diana Petite": "diana-petite",
  Sophie: "sophie",
  Olivia: "olivia",
  Macy: "macy",
  Isabell: "isabell",
  Julia: "julia",
  Ruby: "ruby",
  Victoria: "victoria",
  "Olivia Petite": "olivia-petite",
  "Macy Petite": "macy-petite",
  "Isabell Petite": "isabell-petite",
  "Ruby Petite": "ruby-petite",
  "Victoria Petite": "victoria-petite",
  Браслеты: "bracelets",
  Ожерелье: "necklaces",
  Серьги: "earrings",
  Кольца: "rings",
};

/** Обратный маппинг slug → subcategory (для getProductByPath) */
export const SUBcategorySlugToName: Record<string, string> = Object.fromEntries(
  Object.entries(SUBcategoryToSlug).map(([k, v]) => [v, k])
);

/**
 * Строит путь на страницу товара: /products/{category}/{subcategory}/{productSlug}
 * Товары без subcategory не должны отображаться.
 */
export function generateProductPath(product: {
  name: string;
  collection: string;
  subcategory?: string | null;
}): string | null {
  if (!product.subcategory) return null;
  const subSlug = SUBcategoryToSlug[product.subcategory];
  if (!subSlug) return null;
  const categorySlug = getCategorySlug(product.collection);
  const productSlug = generateProductSlug(product.name);
  return `/products/${categorySlug}/${subSlug}/${productSlug}`;
}

/**
 * Возвращает breadcrumb-элементы для товара: Главная → Коллекция [→ Подкатегория] → Товар.
 */
export function getProductBreadcrumbItems(
  product: { name: string; collection: string; subcategory?: string }
): { label: string; href?: string }[] {
  const items: { label: string; href?: string }[] = [
    { label: "Главная", href: "/" },
  ];

  const categorySlug = getCategorySlug(product.collection);
  items.push({
    label: categorySlug === "watches" ? "Часы" : "Украшения",
    href: `/products/${categorySlug}`,
  });

  if (product.subcategory) {
    const subSlug = SUBcategoryToSlug[product.subcategory];
    if (subSlug) {
      items.push({
        label: product.subcategory,
        href: `/products/${categorySlug}/${subSlug}`,
      });
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

/**
 * Breadcrumbs для /products: Главная → Категория [→ Подкатегория].
 * Для подкатегории категория получает href на /products/{category}.
 */
export function getProductsBreadcrumbItems(
  categorySlug: string,
  subcategorySlug?: string
): { label: string; href?: string }[] {
  const categoryLabel = getCollectionLabel(categorySlug);
  const items: { label: string; href?: string }[] = [
    { label: "Главная", href: "/" },
    {
      label: categoryLabel,
      href: subcategorySlug ? `/products/${categorySlug}` : undefined,
    },
  ];
  if (subcategorySlug) {
    items.push({ label: getCollectionLabel(subcategorySlug) });
  }
  return items;
}

/**
 * Российский номер для отображения: +7 и 10 цифр после (как нормализация в чекауте).
 * 8… → 7…; если первая цифра не 7 — добавляется 7; не более 11 цифр.
 */
export function formatRuPhonePlus7(phone: string | null | undefined): string {
  const raw = (phone ?? "").trim();
  if (!raw) return "—";

  let numbers = raw.replace(/\D/g, "");
  if (numbers.startsWith("8")) {
    numbers = "7" + numbers.slice(1);
  }
  if (numbers && !numbers.startsWith("7")) {
    numbers = "7" + numbers;
  }
  numbers = numbers.slice(0, 11);

  if (numbers.length === 0) {
    return raw;
  }
  return `+${numbers}`;
}

/** Сумма в рублях для отображения: копейки, формат ru-RU (напр. 12 345,67). */
export function formatRub(amount: number): string {
  if (!Number.isFinite(amount)) return "0,00";
  return amount.toLocaleString("ru-RU", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}
