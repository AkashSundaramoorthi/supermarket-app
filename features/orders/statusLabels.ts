import type { OrderStatus } from "./stateMachine";

export const STATUS_LABELS: Record<OrderStatus, string> = {
  pending_payment: "Waiting for payment",
  paid: "Paid",
  received: "Received by store",
  packed: "Packed",
  ready_for_pickup: "Ready for pickup",
  out_for_delivery: "Out for delivery",
  collected: "Collected",
  delivered: "Delivered",
  cancelled: "Cancelled",
  refunded: "Refunded",
};

export const PROGRESS_STEPS: Record<"pickup" | "delivery", OrderStatus[]> = {
  pickup: ["paid", "received", "packed", "ready_for_pickup", "collected"],
  delivery: ["paid", "received", "packed", "out_for_delivery", "delivered"],
};
