import type { Fulfilment } from "@/lib/pricing/calculateCartTotal";

export const ORDER_STATUSES = [
  "pending_payment",
  "paid",
  "received",
  "packed",
  "ready_for_pickup",
  "out_for_delivery",
  "collected",
  "delivered",
  "cancelled",
  "refunded",
] as const;

export type OrderStatus = (typeof ORDER_STATUSES)[number];

type Context = { fulfilment: Fulfilment; wasPaid: boolean };

export function canTransition(from: OrderStatus, to: OrderStatus, { fulfilment, wasPaid }: Context): boolean {
  switch (from) {
    case "pending_payment":
      return to === "paid" || to === "cancelled";
    case "paid":
      return to === "received" || to === "cancelled";
    case "received":
      return to === "packed" || to === "cancelled";
    case "packed":
      if (to === "cancelled") return true;
      if (fulfilment === "pickup") return to === "ready_for_pickup";
      return to === "out_for_delivery";
    case "ready_for_pickup":
      return to === "collected";
    case "out_for_delivery":
      return to === "delivered";
    case "cancelled":
      return to === "refunded" && wasPaid;
    case "collected":
    case "delivered":
    case "refunded":
      return false;
  }
}
