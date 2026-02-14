export interface Product {
  id: string;
  name: string;
  collection: string; // Macy, Olivia, Julia, etc.
  price: number;
  originalPrice: number;
  discount: number; // процент скидки
  colors: string[]; // золото, серебро, розовое золото
  images: string[];
  inStock: boolean;
  variant?: string; // Petite, обычная
  rating?: number; // рейтинг от 1 до 5
  reviewsCount?: number; // количество отзывов
  description?: string;
  specifications?: {
    dimensions?: string;
    material?: string;
    waterResistant?: string;
    warranty?: string;
  };
  relatedProducts?: string[]; // ID сопутствующих товаров
}

export interface CartItem extends Product {
  quantity: number;
  selectedColor: string;
}

export type Collection = 
  | "Diana"
  | "Sophie"
  | "Olivia"
  | "Macy"
  | "Isabell"
  | "Julia"
  | "Ruby"
  | "all";

export type Color = "золото" | "серебро" | "розовое золото" | "all";
