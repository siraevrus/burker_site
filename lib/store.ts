import { create } from "zustand";
import { CartItem, Collection, Color, User } from "./types";

interface Store {
  cart: CartItem[];
  filters: {
    collection: Collection;
    color: Color;
  };
  user: User | null;
  addToCart: (item: CartItem) => void;
  removeFromCart: (id: string) => void;
  updateQuantity: (id: string, quantity: number) => void;
  setCollectionFilter: (collection: Collection) => void;
  setColorFilter: (color: Color) => void;
  getTotalPrice: () => number;
  getCartItemsCount: () => number;
  setUser: (user: User | null) => void;
  clearCart: () => void;
  loadUser: () => Promise<void>;
  logout: () => Promise<void>;
}

export const useStore = create<Store>((set, get) => ({
  cart: [],
  filters: {
    collection: "all",
    color: "all",
  },
  user: null,
  addToCart: (item) => {
    const existingItem = get().cart.find(
      (cartItem) => cartItem.id === item.id && cartItem.selectedColor === item.selectedColor
    );
    
    if (existingItem) {
      set({
        cart: get().cart.map((cartItem) =>
          cartItem.id === item.id && cartItem.selectedColor === item.selectedColor
            ? { ...cartItem, quantity: cartItem.quantity + item.quantity }
            : cartItem
        ),
      });
    } else {
      set({ cart: [...get().cart, item] });
    }
  },
  removeFromCart: (id) => {
    set({ cart: get().cart.filter((item) => item.id !== id) });
  },
  updateQuantity: (id, quantity) => {
    if (quantity <= 0) {
      get().removeFromCart(id);
      return;
    }
    set({
      cart: get().cart.map((item) =>
        item.id === id ? { ...item, quantity } : item
      ),
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
}));
