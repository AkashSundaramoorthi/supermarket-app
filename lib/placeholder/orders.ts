import type { Fulfilment } from "@/lib/pricing/calculateCartTotal";
import type { OrderStatus } from "@/features/orders/stateMachine";

export type PlaceholderOrder = {
  id: string;
  createdAt: string;
  fulfilment: Fulfilment;
  status: OrderStatus;
  totalPaise: number;
  itemCount: number;
  collectionCode: string | null;
};

export const placeholderOrders: PlaceholderOrder[] = [
  {
    id: "ord-1001",
    createdAt: "2026-11-07T18:20:00+05:30",
    fulfilment: "pickup",
    status: "ready_for_pickup",
    totalPaise: 16400,
    itemCount: 3,
    collectionCode: "A142",
  },
  {
    id: "ord-1000",
    createdAt: "2026-11-05T12:05:00+05:30",
    fulfilment: "delivery",
    status: "delivered",
    totalPaise: 21900,
    itemCount: 5,
    collectionCode: null,
  },
];

export function findPlaceholderOrder(id: string): PlaceholderOrder | undefined {
  return placeholderOrders.find((o) => o.id === id);
}
