// Функция для получения текста верхней строки из localStorage
export function getTopBannerText(): string {
  if (typeof window === "undefined") {
    return "КУПИТЕ СЕЙЧАС, ПЛАТИТЕ ПОТОМ С KLARNA • Бесплатная доставка от 39 €";
  }
  const stored = localStorage.getItem("top_banner_text");
  return stored || "КУПИТЕ СЕЙЧАС, ПЛАТИТЕ ПОТОМ С KLARNA • Бесплатная доставка от 39 €";
}

// Функция для сохранения текста верхней строки в localStorage
export function saveTopBannerText(text: string): void {
  if (typeof window !== "undefined") {
    localStorage.setItem("top_banner_text", text);
  }
}
