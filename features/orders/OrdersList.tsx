"use client";

import Link from "next/link";
import { useState } from "react";
import { useHydrated } from "@/lib/hooks/useHydrated";
import { formatPaise } from "@/lib/format/money";
import { placeholderOrders } from "@/lib/placeholder/orders";
import { STATUS_LABELS } from "./statusLabels";
import { useOrdersStore } from "./ordersStore";

export function OrdersList() {
  const hydrated = useHydrated();
  const placed = useOrdersStore((s) => s.placed);
  const [filter, setFilter] = useState<"all" | "active" | "completed">("all");

  if (!hydrated) return null;

  // Combine placed orders with demo orders, deduplicating IDs
  const allOrdersMap = new Map<string, (typeof placeholderOrders)[number]>();
  [...placed, ...placeholderOrders].forEach((o) => {
    if (!allOrdersMap.has(o.id)) allOrdersMap.set(o.id, o);
  });
  const orders = Array.from(allOrdersMap.values());

  const visible = orders.filter((o) => {
    const isCompleted = o.status === "collected" || o.status === "delivered" || o.status === "refunded";
    if (filter === "active") return !isCompleted;
    if (filter === "completed") return isCompleted;
    return true;
  });

  return (
    <div className="flex flex-col gap-4 p-4 pb-20">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">Your Orders</h1>
          <p className="text-xs text-muted">Track live deliveries and order history</p>
        </div>
        <Link
          href="/"
          className="rounded-[8px] bg-accent/10 px-3 py-1.5 text-xs font-semibold text-accent hover:bg-accent hover:text-accent-fg"
        >
          + New Order
        </Link>
      </div>

      {/* Filter Tabs */}
      <div className="grid grid-cols-3 rounded-[10px] border border-border bg-surface p-1 text-xs font-semibold">
        <button
          onClick={() => setFilter("all")}
          className={`min-h-8 rounded-[7px] transition-all ${
            filter === "all" ? "bg-accent text-accent-fg shadow-2xs" : "text-muted"
          }`}
        >
          All ({orders.length})
        </button>
        <button
          onClick={() => setFilter("active")}
          className={`min-h-8 rounded-[7px] transition-all ${
            filter === "active" ? "bg-accent text-accent-fg shadow-2xs" : "text-muted"
          }`}
        >
          Active
        </button>
        <button
          onClick={() => setFilter("completed")}
          className={`min-h-8 rounded-[7px] transition-all ${
            filter === "completed" ? "bg-accent text-accent-fg shadow-2xs" : "text-muted"
          }`}
        >
          Completed
        </button>
      </div>

      {/* Orders List */}
      {visible.length === 0 ? (
        <div className="flex min-h-[40vh] flex-col items-center justify-center gap-3 p-6 text-center">
          <span className="text-4xl">🧾</span>
          <p className="text-sm font-semibold">No orders found</p>
          <p className="text-xs text-muted">You haven&apos;t placed any orders in this category.</p>
          <Link
            href="/"
            className="mt-2 rounded-[8px] bg-accent px-4 py-2 text-xs font-semibold text-accent-fg"
          >
            Start Shopping
          </Link>
        </div>
      ) : (
        <ul className="flex flex-col gap-3">
          {visible.map((order) => {
            const isCompleted =
              order.status === "collected" || order.status === "delivered" || order.status === "refunded";

            const dateStr = new Date(order.createdAt).toLocaleDateString("en-IN", {
              day: "numeric",
              month: "short",
              hour: "2-digit",
              minute: "2-digit",
            });

            return (
              <li key={order.id}>
                <Link
                  href={`/orders/${order.id}`}
                  className="group flex flex-col gap-2 rounded-[14px] border border-border bg-surface p-4 shadow-2xs transition-all hover:border-accent/40 hover:shadow-xs active:scale-[0.99]"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-fg group-hover:text-accent">
                        Order #{order.id}
                      </span>
                      <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-[10px] font-semibold text-muted dark:bg-neutral-800">
                        {order.fulfilment === "pickup" ? "Pickup 🏪" : "Delivery 🛵"}
                      </span>
                    </div>

                    <span
                      className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${
                        isCompleted
                          ? "bg-neutral-100 text-muted dark:bg-neutral-800"
                          : "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                      }`}
                    >
                      {STATUS_LABELS[order.status]}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-xs text-muted">
                    <span>{dateStr}</span>
                    <span>{order.itemCount} items</span>
                  </div>

                  {order.collectionCode && order.status === "ready_for_pickup" && (
                    <div className="flex items-center justify-between rounded-[8px] bg-accent/10 px-3 py-1.5 text-xs text-accent">
                      <span className="font-semibold">Counter Code</span>
                      <span className="font-extrabold tracking-wider">{order.collectionCode}</span>
                    </div>
                  )}

                  <div className="flex items-center justify-between border-t border-border pt-2">
                    <span className="text-xs text-muted">Total Paid</span>
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm font-bold text-fg">
                        {formatPaise(order.totalPaise)}
                      </span>
                      <span className="text-xs text-accent group-hover:translate-x-0.5 transition-transform">
                        →
                      </span>
                    </div>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
