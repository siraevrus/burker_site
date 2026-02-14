export interface PromoBanner {
  id: string;
  image: string;
  productLink: string;
  title?: string;
  subtitle?: string;
}

// Начальные данные промоблоков
export const initialPromoBanners: PromoBanner[] = [
  {
    id: "1",
    image: "/Isabell_gold_burgundy_1.webp",
    productLink: "/sale",
    title: "VALENTINE'S SALE",
    subtitle: "ЧАСЫ • УКРАШЕНИЯ",
  },
];

// Проверка, является ли строка base64
export function isBase64(str: string): boolean {
  try {
    return btoa(atob(str)) === str;
  } catch {
    return str.startsWith("data:image");
  }
}

// Функция для получения баннеров из localStorage
export function getPromoBanners(): PromoBanner[] {
  if (typeof window === "undefined") {
    return initialPromoBanners;
  }
  const stored = localStorage.getItem("promo_banners");
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch {
      return initialPromoBanners;
    }
  }
  return initialPromoBanners;
}

// Функция для сохранения баннеров в localStorage
export function savePromoBanners(banners: PromoBanner[]): void {
  if (typeof window !== "undefined") {
    localStorage.setItem("promo_banners", JSON.stringify(banners));
  }
}
