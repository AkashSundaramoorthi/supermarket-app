import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type { PlaceholderOrder } from "@/lib/placeholder/orders";
import type { OrderStatus } from "./stateMachine";

type OrdersState = {
  placed: PlaceholderOrder[];
  addOrder: (order: PlaceholderOrder) => void;
  updateStatus: (orderId: string, status: OrderStatus) => void;
};

export const useOrdersStore = create<OrdersState>()(
  persist(
    (set) => ({
      placed: [],
      addOrder: (order) => set((state) => ({ placed: [order, ...state.placed] })),
      updateStatus: (orderId, status) =>
        set((state) => ({
          placed: state.placed.map((o) => (o.id === orderId ? { ...o, status } : o)),
        })),
    }),
    { name: "orders-v1", storage: createJSONStorage(() => localStorage) },
  ),
);
