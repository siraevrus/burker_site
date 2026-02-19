import { create } from "zustand";
import { persist } from "zustand/middleware";
import { CartItem, Collection, Color, User } from "./types";

/** По таможенным правилам — не более 3 вещей одного типа в один заказ */
export const MAX_QUANTITY_PER_PRODUCT = 3;

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
  setCollectionFilter: (collection: Collection) => void;
  setColorFilter: (color: Color) => void;
  getTotalPrice: () => number;
  getCartItemsCount: () => number;
  setUser: (user: User | null) => void;
  clearCart: () => void;
  loadUser: () => Promise<void>;
  logout: () => Promise<void>;
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
  addToCart: (item) => {
    const totalForProduct = get().getTotalQuantityByProductId(item.id);
    const canAdd = Math.min(item.quantity, MAX_QUANTITY_PER_PRODUCT - totalForProduct);
    if (canAdd <= 0) return;

    const existingItem = get().cart.find(
      (cartItem) => cartItem.id === item.id && cartItem.selectedColor === item.selectedColor
    );

    if (existingItem) {
      const newQty = Math.min(existingItem.quantity + canAdd, MAX_QUANTITY_PER_PRODUCT);
      set({
        cart: get().cart.map((cartItem) =>
          cartItem.id === item.id && cartItem.selectedColor === item.selectedColor
            ? { ...cartItem, quantity: newQty }
            : cartItem
        ),
      });
    } else {
      set({ cart: [...get().cart, { ...item, quantity: canAdd }] });
    }
  },
  removeFromCart: (id, selectedColor) => {
    if (selectedColor !== undefined) {
      set({
        cart: get().cart.filter(
          (item) => !(item.id === id && item.selectedColor === selectedColor)
        ),
      });
    } else {
      set({ cart: get().cart.filter((item) => item.id !== id) });
    }
  },
  updateQuantity: (id, quantity, selectedColor) => {
    const cart = get().cart;
    const targetItems =
      selectedColor !== undefined
        ? cart.filter((item) => item.id === id && item.selectedColor === selectedColor)
        : cart.filter((item) => item.id === id);

    if (targetItems.length === 0) return;
    const currentQty = targetItems[0].quantity;
    const otherQty = get().getTotalQuantityByProductId(id) - currentQty;

    if (quantity <= 0) {
      get().removeFromCart(id, selectedColor);
      return;
    }

    const cappedQty = Math.min(quantity, MAX_QUANTITY_PER_PRODUCT - otherQty);
    if (cappedQty <= 0) return;

    set({
      cart: cart.map((item) => {
        const match =
          selectedColor !== undefined
            ? item.id === id && item.selectedColor === selectedColor
            : item.id === id;
        return match ? { ...item, quantity: cappedQty } : item;
      }),
    });
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
  },
  loadUser: async () => {
    try {
      const response = await fetch("/api/auth/me");
      const data = await response.json();
      if (data.user) {
        set({ user: data.user });
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
    }),
    {
      name: "burker-cart-storage",
      partialize: (state) => ({ cart: state.cart }),
      skipHydration: true,
    }
  )
);
