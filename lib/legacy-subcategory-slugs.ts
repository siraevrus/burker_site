/**
 * Запасной маппинг, если таблица CatalogLine пуста (старые стенды до миграции).
 * При наличии строк в БД они переопределяют эти значения.
 */
export const LEGACY_SUBCATEGORY_TO_SLUG: Record<string, string> = {
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
