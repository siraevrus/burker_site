import { create } from "zustand";
import { persist } from "zustand/middleware";
import { CartItem, Collection, Color, Product, User } from "./types";

function mergeCartItemWithProduct(item: CartItem, fresh: Product): CartItem {
  return {
    ...item,
    price: fresh.price,
    originalPrice: fresh.originalPrice,
    discount: fresh.discount,
    priceEur: fresh.priceEur,
    originalPriceEur: fresh.originalPriceEur,
    inStock: fresh.inStock,
    soldOut: fresh.soldOut,
    disabled: fresh.disabled,
    name: fresh.name,
    images: fresh.images,
    colors: fresh.colors,
    bestseller: fresh.bestseller,
    collection: fresh.collection,
    subcategory: fresh.subcategory,
    variant: fresh.variant,
  };
}

/** По таможенным правилам — не более 3 вещей одной категории в один заказ (часы, браслеты, ожерелье, серьги, кольца) */
export const MAX_QUANTITY_PER_CATEGORY = 3;

let syncTimer: ReturnType<typeof setTimeout> | null = null;

function syncCartToServer(cart: CartItem[]) {
  if (syncTimer) clearTimeout(syncTimer);
  syncTimer = setTimeout(() => {
    fetch("/api/cart", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        items: cart.map((item) => ({
          id: item.id,
          name: item.name,
          price: item.price,
          images: item.images,
          selectedColor: item.selectedColor,
          quantity: item.quantity,
          collection: item.collection,
          subcategory: item.subcategory,
        })),
      }),
    }).catch(() => {});
  }, 500);
}

/** В корзине есть позиции в статусе «распродан» (актуально после refreshCartPrices). */
export function cartHasSoldOutItems(cart: CartItem[]): boolean {
  return cart.some((item) => item.soldOut);
}

/** Категория для таможенного лимита: часы — одна категория, украшения — по subcategory */
export function getCustomsCategory(item: { collection: string; subcategory?: string | null }): string {
  if (item.collection === "Украшения") {
    return item.subcategory || "Украшения";
  }
  return "watches";
}

interface Store {
  cart: CartItem[];
  filters: {
    collection: Collection;
    color: Color;
  };
  user: User | null;
  addToCart: (item: CartItem) => void;
  removeFromCart: (id: string, selectedColor?: string) => void;
  updateQuantity: (id: string, quantity: number, selectedColor?: string) => void;
  getTotalQuantityByProductId: (id: string) => number;
  getTotalQuantityByCategory: (category: string) => number;
  setCollectionFilter: (collection: Collection) => void;
  setColorFilter: (color: Color) => void;
  getTotalPrice: () => number;
  getCartItemsCount: () => number;
  setUser: (user: User | null) => void;
  clearCart: () => void;
  loadUser: () => Promise<void>;
  logout: () => Promise<void>;
  /** Актуальные цены и наличие из БД (batch); сохраняет quantity и selectedColor. */
  refreshCartPrices: () => Promise<void>;
}

export const useStore = create<Store>()(
  persist(
    (set, get) => ({
      cart: [],
      filters: {
        collection: "all",
        color: "all",
      },
      user: null,
  getTotalQuantityByProductId: (id) => {
    return get().cart
      .filter((item) => item.id === id)
      .reduce((sum, item) => sum + item.quantity, 0);
  },
  getTotalQuantityByCategory: (category) => {
    return get().cart
      .filter((item) => getCustomsCategory(item) === category)
      .reduce((sum, item) => sum + item.quantity, 0);
  },
  addToCart: (item) => {
    if (item.soldOut) {
      return; // Товар распродан, не добавляем в корзину
    }
    const category = getCustomsCategory(item);
    const currentCategoryTotal = get().getTotalQuantityByCategory(category);
    const canAdd = Math.min(item.quantity, MAX_QUANTITY_PER_CATEGORY - currentCategoryTotal);
    if (canAdd <= 0) return;

    const existingItem = get().cart.find(
      (cartItem) => cartItem.id === item.id && cartItem.selectedColor === item.selectedColor
    );

    if (existingItem) {
      const newQty = Math.min(existingItem.quantity + canAdd, MAX_QUANTITY_PER_CATEGORY);
      const newCart = get().cart.map((cartItem) =>
        cartItem.id === item.id && cartItem.selectedColor === item.selectedColor
          ? { ...cartItem, quantity: newQty }
          : cartItem
      );
      set({ cart: newCart });
      if (get().user) syncCartToServer(newCart);
    } else {
      const newCart = [...get().cart, { ...item, quantity: canAdd }];
      set({ cart: newCart });
      if (get().user) syncCartToServer(newCart);
    }
  },
  removeFromCart: (id, selectedColor) => {
    let newCart: CartItem[];
    if (selectedColor !== undefined) {
      newCart = get().cart.filter(
        (item) => !(item.id === id && item.selectedColor === selectedColor)
      );
    } else {
      newCart = get().cart.filter((item) => item.id !== id);
    }
    set({ cart: newCart });
    if (get().user) syncCartToServer(newCart);
  },
  updateQuantity: (id, quantity, selectedColor) => {
    const cart = get().cart;
    const targetItems =
      selectedColor !== undefined
        ? cart.filter((item) => item.id === id && item.selectedColor === selectedColor)
        : cart.filter((item) => item.id === id);

    if (targetItems.length === 0) return;
    const targetItem = targetItems[0];
    const currentQty = targetItem.quantity;
    const category = getCustomsCategory(targetItem);
    const otherCategoryQty = get().getTotalQuantityByCategory(category) - currentQty;

    if (quantity <= 0) {
      get().removeFromCart(id, selectedColor);
      return;
    }

    const cappedQty = Math.min(quantity, MAX_QUANTITY_PER_CATEGORY - otherCategoryQty);
    if (cappedQty <= 0) return;

    const newCart = cart.map((item) => {
      const match =
        selectedColor !== undefined
          ? item.id === id && item.selectedColor === selectedColor
          : item.id === id;
      return match ? { ...item, quantity: cappedQty } : item;
    });
    set({ cart: newCart });
    if (get().user) syncCartToServer(newCart);
  },
  setCollectionFilter: (collection) => {
    set({ filters: { ...get().filters, collection } });
  },
  setColorFilter: (color) => {
    set({ filters: { ...get().filters, color } });
  },
  getTotalPrice: () => {
    return get().cart.reduce(
      (total, item) => total + item.price * item.quantity,
      0
    );
  },
  getCartItemsCount: () => {
    return get().cart.reduce((total, item) => total + item.quantity, 0);
  },
  setUser: (user) => {
    set({ user });
  },
  clearCart: () => {
    set({ cart: [] });
    if (get().user) syncCartToServer([]);
  },
  loadUser: async () => {
    try {
      const response = await fetch("/api/auth/me");
      const data = await response.json();
      if (data.user) {
        set({ user: data.user });
        const cart = get().cart;
        if (cart.length > 0) syncCartToServer(cart);
      } else {
        set({ user: null });
      }
    } catch (error) {
      console.error("Error loading user:", error);
      set({ user: null });
    }
  },
  logout: async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      set({ user: null, cart: [] });
      window.location.href = "/";
    } catch (error) {
      console.error("Error logging out:", error);
    }
  },
  refreshCartPrices: async () => {
    const cart = get().cart;
    if (cart.length === 0) return;
    const ids = [...new Set(cart.map((i) => i.id))];
    const chunkSize = 80;
    try {
      const products: Product[] = [];
      for (let i = 0; i < ids.length; i += chunkSize) {
        const chunk = ids.slice(i, i + chunkSize);
        const res = await fetch("/api/products/cart-prices", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ids: chunk }),
        });
        if (!res.ok) continue;
        const data = await res.json();
        if (Array.isArray(data.products)) products.push(...data.products);
      }
      if (products.length === 0) return;
      const byId = new Map(products.map((p) => [p.id, p]));
      const newCart = cart.map((item) => {
        const fresh = byId.get(item.id);
        if (!fresh) return item;
        return mergeCartItemWithProduct(item, fresh);
      });
      set({ cart: newCart });
      if (get().user) syncCartToServer(newCart);
    } catch {
      // сеть / парсинг — оставляем корзину как есть
    }
  },
    }),
    {
      name: "burker-cart-storage",
      partialize: (state) => ({ cart: state.cart }),
      skipHydration: true,
    }
  )
);
