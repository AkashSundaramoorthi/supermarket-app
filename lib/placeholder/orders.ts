import type { Fulfilment } from "@/lib/pricing/calculateCartTotal";
import type { OrderStatus } from "@/features/orders/stateMachine";

export const PAYMENT_METHODS = ["upi", "cod"] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

export type OrderItemSnapshot = {
  name: string;
  qty: number;
  unitPricePaise: number;
};

export type PlaceholderOrder = {
  id: string;
  createdAt: string;
  fulfilment: Fulfilment;
  status: OrderStatus;
  paymentMethod: PaymentMethod;
  totalPaise: number;
  itemCount: number;
  collectionCode: string | null;
  items?: OrderItemSnapshot[];
  address?: string;
};

export const placeholderOrders: PlaceholderOrder[] = [
  {
    id: "ord-1001",
    createdAt: "2026-11-07T18:20:00+05:30",
    fulfilment: "pickup",
    status: "ready_for_pickup",
    paymentMethod: "upi",
    totalPaise: 16400,
    itemCount: 3,
    collectionCode: "A142",
    items: [
      { name: "Pasteurized Full Cream Milk", qty: 2, unitPricePaise: 6500 },
      { name: "Farm Fresh Hybrid Tomatoes", qty: 1, unitPricePaise: 3400 },
    ],
  },
  {
    id: "ord-1000",
    createdAt: "2026-11-05T12:05:00+05:30",
    fulfilment: "delivery",
    status: "delivered",
    paymentMethod: "cod",
    totalPaise: 21900,
    itemCount: 4,
    collectionCode: null,
    address: "Flat 402, Green Meadows, 5th Main",
    items: [
      { name: "Classic Masala 2-Min Noodles", qty: 2, unitPricePaise: 5600 },
      { name: "Classic Salted Crispy Chips", qty: 2, unitPricePaise: 2000 },
    ],
  },
];

export function findPlaceholderOrder(id: string): PlaceholderOrder | undefined {
  return placeholderOrders.find((o) => o.id === id);
}
