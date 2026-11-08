"use client";

import Link from "next/link";
import { useHydrated } from "@/lib/hooks/useHydrated";
import { formatPaise } from "@/lib/format/money";
import { placeholderOrders } from "@/lib/placeholder/orders";
import { STATUS_LABELS } from "./statusLabels";
import { useOrdersStore } from "./ordersStore";

export function OrdersList() {
  const hydrated = useHydrated();
  const placed = useOrdersStore((s) => s.placed);
  if (!hydrated) return null;
  const orders = [...placed, ...placeholderOrders];

  return (
    <div className="flex flex-col gap-4 p-4">
      <h1 className="text-xl font-semibold">Orders</h1>
      {orders.length === 0 && <p className="text-sm text-muted">No orders yet.</p>}
      <ul className="flex flex-col gap-3">
        {orders.map((order) => (
          <li key={order.id}>
            <Link href={`/orders/${order.id}`} className="flex flex-col gap-1 rounded-[12px] border-[0.5px] border-border bg-surface p-4">
              <div className="flex justify-between text-sm font-medium">
                <span>Order {order.id}</span>
                <span>{formatPaise(order.totalPaise)}</span>
              </div>
              <p className="text-xs text-muted">
                {order.itemCount} items · {order.fulfilment === "pickup" ? "Pickup" : "Delivery"} · {STATUS_LABELS[order.status]}
              </p>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
