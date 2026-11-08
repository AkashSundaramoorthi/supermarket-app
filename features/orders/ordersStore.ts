import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type { PlaceholderOrder } from "@/lib/placeholder/orders";

type OrdersState = {
  placed: PlaceholderOrder[];
  addOrder: (order: PlaceholderOrder) => void;
};

export const useOrdersStore = create<OrdersState>()(
  persist(
    (set) => ({
      placed: [],
      addOrder: (order) => set((state) => ({ placed: [order, ...state.placed] })),
    }),
    { name: "orders-v1", storage: createJSONStorage(() => localStorage) },
  ),
);
