import type { OrderStatus } from "./stateMachine";

export const STATUS_LABELS: Record<OrderStatus, string> = {
  pending_payment: "Waiting for payment",
  paid: "Paid",
  received: "Order confirmed",
  packed: "Packed",
  ready_for_pickup: "Ready for pickup",
  out_for_delivery: "Out for delivery",
  collected: "Collected from Store Owner",
  delivered: "Delivered",
  cancelled: "Cancelled",
  refunded: "Refunded",
};

export const DELIVERY_TRACKER_STEPS: {
  key: OrderStatus;
  label: string;
  description: string;
}[] = [
  { key: "paid", label: "Paid", description: "Payment received & order confirmed." },
  { key: "packed", label: "Packed", description: "Freshly picked and safely packed at the store." },
  { key: "out_for_delivery", label: "Out for delivery", description: "Driver Ramesh is on the way to your delivery address." },
  { key: "delivered", label: "Delivered", description: "Order safely handed over at your doorstep." },
];

export const PROGRESS_STEPS: Record<"pickup" | "delivery", OrderStatus[]> = {
  pickup: ["paid", "packed", "ready_for_pickup", "collected"],
  delivery: ["paid", "packed", "out_for_delivery", "delivered"],
};
