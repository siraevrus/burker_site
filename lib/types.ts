export interface Product {
  id: string;
  bodyId?: string; // body_id из JSON для использования в URL
  name: string;
  collection: string; // Macy, Olivia, Julia, etc.
  subcategory?: string; // Подкатегория из JSON (Diana, Sophie, Браслеты, и т.д.)
  bestseller?: boolean; // Флаг бестселлера из JSON
  price: number;
  originalPrice: number;
  originalPriceEur?: number; // Сырая цена в EUR для расчёта комиссии
  discount: number; // процент скидки
  colors: string[]; // золото, серебро, розовое золото
  images: string[];
  inStock: boolean;
  soldOut?: boolean; // Товар распродан (Sold_out: 1 = распродан, 0 = в наличии)
  disabled?: boolean; // Отключенный товар не отображается на сайте
  variant?: string; // Petite, обычная
  rating?: number; // рейтинг от 1 до 5
  reviewsCount?: number; // количество отзывов
  description?: string;
  specifications?: Record<string, string>;
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
  productLink?: string;
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
  originalPriceEur?: number;
  selectedColor: string;
  quantity: number;
}

export interface Order {
  id: string;
  orderNumber?: string; // Читаемый номер заказа: burker_YYYYMMDDHHmmss_userId_orderId_XXX
  userId?: string;
  email: string;
  firstName: string;
  lastName: string;
  middleName: string; // Отчество
  phone: string;
  address?: string;
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
  requiresConfirmation?: boolean; // Требуется ли связаться для подтверждения заказа
  promoCode?: string | null; // Код промокода, примененный к заказу
  promoDiscount?: number | null; // Сумма скидки по промокоду
  promoDiscountType?: string | null; // "fixed" (₽) или "percent" (%) на момент заказа
  status: string;
  totalAmount: number;
  shippingCost: number;
  eurRate?: number | null; // Курс EUR к USD на момент оформления
  rubRate?: number | null; // Курс RUB к USD на момент оформления
  purchaseProofImage?: string; // URL изображения подтверждения выкупа
  sellerTrackNumber?: string; // Трек-номер продавца
  russiaTrackNumber?: string; // Трек-номер для РФ
  // Оплата (T-Bank СБП)
  paymentStatus?: string; // pending | paid | failed | expired | cancelled
  paymentId?: string | null;
  paymentLink?: string | null;
  paidAt?: Date | null;
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
  address?: string;
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
  requiresConfirmation?: boolean; // Требуется ли связаться для подтверждения заказа
}

export interface Page {
  id: string;
  title: string;
  slug: string;
  content: string;
  category?: "customer-service" | "policies"; // Категория страницы
  published: boolean;
  seoTitle?: string | null;    // SEO: заголовок для <title>
  seoDescription?: string | null; // SEO: описание для <meta name="description">
  createdAt: Date;
  updatedAt: Date;
}

export interface PromoCode {
  id: string;
  code: string;
  discountType: "fixed" | "percent";
  discount: number;
  validFrom: Date;
  validUntil: Date;
  minOrderAmount: number | null;
  firstOrderOnly: boolean;
  usageLimit: number;
  isActive: boolean;
  usageCount?: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface Subscriber {
  id: string;
  email: string;
  createdAt: Date;
  updatedAt: Date;
}
