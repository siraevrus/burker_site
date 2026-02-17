export interface Product {
  id: string;
  bodyId?: string; // body_id из JSON для использования в URL
  name: string;
  collection: string; // Macy, Olivia, Julia, etc.
  subcategory?: string; // Подкатегория из JSON (Diana, Sophie, Браслеты, и т.д.)
  bestseller?: boolean; // Флаг бестселлера из JSON
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

export interface PromoBanner {
  id: string;
  image: string;
  productLink: string;
  title?: string;
  subtitle?: string;
}

export interface User {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  emailVerified: boolean;
  createdAt: Date;
}

export interface OrderItem {
  id: string;
  orderId: string;
  productId: string;
  productName: string;
  productPrice: number;
  selectedColor: string;
  quantity: number;
}

export interface Order {
  id: string;
  userId?: string;
  email: string;
  firstName: string;
  lastName: string;
  middleName: string; // Отчество
  phone: string;
  address: string;
  cdekAddress: string; // Адрес ПВЗ СДЕК
  cdekPointCode?: string; // Код ПВЗ СДЭК
  city?: string;
  postalCode?: string;
  country?: string;
  comment?: string;
  // Данные для таможенного оформления
  inn: string; // ИНН
  passportSeries: string; // Серия паспорта
  passportNumber: string; // Номер паспорта
  passportIssueDate: string; // Дата выдачи паспорта
  passportIssuedBy: string; // Кем выдан паспорт
  status: string;
  totalAmount: number;
  shippingCost: number;
  items: OrderItem[];
  createdAt: Date;
  updatedAt: Date;
}

export interface AuthResponse {
  success: boolean;
  user?: User;
  error?: string;
  requiresVerification?: boolean;
  userId?: string;
}

export interface CheckoutFormData {
  email: string;
  firstName: string;
  lastName: string;
  middleName: string; // Отчество
  phone: string;
  address: string;
  cdekAddress: string; // Адрес ПВЗ СДЕК
  cdekPointCode?: string; // Код ПВЗ СДЭК
  city?: string;
  postalCode?: string;
  country?: string;
  comment?: string;
  // Данные для таможенного оформления
  inn: string; // ИНН
  passportSeries: string; // Серия паспорта
  passportNumber: string; // Номер паспорта
  passportIssueDate: string; // Дата выдачи паспорта
  passportIssuedBy: string; // Кем выдан паспорт
}
