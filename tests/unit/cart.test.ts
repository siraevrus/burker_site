import { describe, it, expect } from "vitest";
import {
  cartHasSoldOutItems,
  getCustomsCategory,
  MAX_QUANTITY_PER_CATEGORY,
} from "@/lib/store";
import type { CartItem } from "@/lib/types";

// ─── Фикстуры ─────────────────────────────────────────────────────────────────

function makeWatch(overrides: Partial<CartItem> = {}): CartItem {
  return {
    id: "watch-1",
    name: "Diana Gold",
    collection: "Diana",
    subcategory: "Diana",
    price: 15000,
    originalPrice: 18000,
    discount: 16,
    colors: ["золото"],
    images: ["/diana_gold.webp"],
    inStock: true,
    soldOut: false,
    quantity: 1,
    selectedColor: "золото",
    ...overrides,
  };
}

function makeJewelry(overrides: Partial<CartItem> = {}): CartItem {
  return {
    id: "bracelet-1",
    name: "Браслет Sophie",
    collection: "Украшения",
    subcategory: "Браслеты",
    price: 5000,
    originalPrice: 6000,
    discount: 16,
    colors: ["золото"],
    images: ["/bracelet.webp"],
    inStock: true,
    soldOut: false,
    quantity: 1,
    selectedColor: "золото",
    ...overrides,
  };
}

// ─── cartHasSoldOutItems ──────────────────────────────────────────────────────

describe("cartHasSoldOutItems", () => {
  it("возвращает false для пустой корзины", () => {
    expect(cartHasSoldOutItems([])).toBe(false);
  });

  it("возвращает false когда все товары в наличии", () => {
    const cart = [makeWatch(), makeJewelry()];
    expect(cartHasSoldOutItems(cart)).toBe(false);
  });

  it("возвращает true если хотя бы один товар распродан", () => {
    const cart = [makeWatch(), makeWatch({ id: "watch-2", soldOut: true })];
    expect(cartHasSoldOutItems(cart)).toBe(true);
  });

  it("возвращает true если все товары распроданы", () => {
    const cart = [makeWatch({ soldOut: true }), makeJewelry({ soldOut: true })];
    expect(cartHasSoldOutItems(cart)).toBe(true);
  });
});

// ─── getCustomsCategory ───────────────────────────────────────────────────────

describe("getCustomsCategory", () => {
  it("часы → категория 'watches'", () => {
    expect(getCustomsCategory({ collection: "Diana" })).toBe("watches");
    expect(getCustomsCategory({ collection: "Sophie" })).toBe("watches");
    expect(getCustomsCategory({ collection: "Macy" })).toBe("watches");
    expect(getCustomsCategory({ collection: "Victoria" })).toBe("watches");
  });

  it("украшения → возвращает subcategory", () => {
    expect(getCustomsCategory({ collection: "Украшения", subcategory: "Браслеты" })).toBe("Браслеты");
    expect(getCustomsCategory({ collection: "Украшения", subcategory: "Серьги" })).toBe("Серьги");
    expect(getCustomsCategory({ collection: "Украшения", subcategory: "Кольца" })).toBe("Кольца");
  });

  it("украшения без subcategory → 'Украшения'", () => {
    expect(getCustomsCategory({ collection: "Украшения" })).toBe("Украшения");
    expect(getCustomsCategory({ collection: "Украшения", subcategory: null })).toBe("Украшения");
  });
});

// ─── MAX_QUANTITY_PER_CATEGORY ────────────────────────────────────────────────

describe("MAX_QUANTITY_PER_CATEGORY", () => {
  it("таможенный лимит равен 3", () => {
    expect(MAX_QUANTITY_PER_CATEGORY).toBe(3);
  });
});

// ─── Расчёт суммы корзины (чистая логика) ────────────────────────────────────

describe("Расчёт суммы корзины", () => {
  function getTotalPrice(cart: CartItem[]): number {
    return cart.reduce((total, item) => total + item.price * item.quantity, 0);
  }

  it("пустая корзина → сумма 0", () => {
    expect(getTotalPrice([])).toBe(0);
  });

  it("один товар, количество 1", () => {
    const cart = [makeWatch({ price: 15000, quantity: 1 })];
    expect(getTotalPrice(cart)).toBe(15000);
  });

  it("один товар, количество 3", () => {
    const cart = [makeWatch({ price: 15000, quantity: 3 })];
    expect(getTotalPrice(cart)).toBe(45000);
  });

  it("несколько товаров разных категорий", () => {
    const cart = [
      makeWatch({ price: 15000, quantity: 2 }),
      makeJewelry({ price: 5000, quantity: 1 }),
    ];
    expect(getTotalPrice(cart)).toBe(35000);
  });

  it("товар с нулевой ценой не влияет на сумму", () => {
    const cart = [
      makeWatch({ price: 15000, quantity: 1 }),
      makeJewelry({ price: 0, quantity: 1 }),
    ];
    expect(getTotalPrice(cart)).toBe(15000);
  });
});

// ─── Количество позиций в корзине ────────────────────────────────────────────

describe("Количество позиций в корзине", () => {
  function getCartItemsCount(cart: CartItem[]): number {
    return cart.reduce((total, item) => total + item.quantity, 0);
  }

  it("пустая корзина → 0 позиций", () => {
    expect(getCartItemsCount([])).toBe(0);
  });

  it("два товара по 1 штуке → 2 позиции", () => {
    const cart = [makeWatch({ quantity: 1 }), makeJewelry({ quantity: 1 })];
    expect(getCartItemsCount(cart)).toBe(2);
  });

  it("один товар в количестве 3 → 3 позиции", () => {
    const cart = [makeWatch({ quantity: 3 })];
    expect(getCartItemsCount(cart)).toBe(3);
  });
});
