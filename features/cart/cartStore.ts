import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

export const MAX_QTY_PER_ITEM = 20;

export type CartLine = {
  productId: string;
  name: string;
  unit: string;
  unitPricePaise: number;
  qty: number;
};

type CartState = {
  items: CartLine[];
  addItem: (product: Omit<CartLine, "qty">) => void;
  setQty: (productId: string, qty: number) => void;
  clear: () => void;
};

export const useCartStore = create<CartState>()(
  persist(
    (set) => ({
      items: [],
      addItem: (product) =>
        set((state) => {
          const existing = state.items.find((i) => i.productId === product.productId);
          if (existing) {
            return {
              items: state.items.map((i) =>
                i.productId === product.productId ? { ...i, qty: Math.min(i.qty + 1, MAX_QTY_PER_ITEM) } : i,
              ),
            };
          }
          return { items: [...state.items, { ...product, qty: 1 }] };
        }),
      setQty: (productId, qty) =>
        set((state) => ({
          items:
            qty <= 0
              ? state.items.filter((i) => i.productId !== productId)
              : state.items.map((i) =>
                  i.productId === productId ? { ...i, qty: Math.min(qty, MAX_QTY_PER_ITEM) } : i,
                ),
        })),
      clear: () => set({ items: [] }),
    }),
    { name: "cart-v1", storage: createJSONStorage(() => localStorage) },
  ),
);
