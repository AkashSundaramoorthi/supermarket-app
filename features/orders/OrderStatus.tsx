"use client";

import Link from "next/link";
import { useState } from "react";
import { useHydrated } from "@/lib/hooks/useHydrated";
import { formatPaise } from "@/lib/format/money";
import { findPlaceholderOrder } from "@/lib/placeholder/orders";
import { store } from "@/lib/placeholder/catalog";
import { PROGRESS_STEPS, STATUS_LABELS } from "./statusLabels";
import { canTransition, type OrderStatus as OrderStatusType } from "./stateMachine";
import { useOrdersStore } from "./ordersStore";
import { useRealtimeOrder } from "@/lib/supabase/useRealtimeOrder";

export function OrderStatus({ orderId }: { orderId: string }) {
  const hydrated = useHydrated();
  const placed = useOrdersStore((s) => s.placed);
  const updateStatus = useOrdersStore((s) => s.updateStatus);
  const [advancing, setAdvancing] = useState(false);

  const order = placed.find((o) => o.id === orderId) ?? findPlaceholderOrder(orderId);

  const { status: liveStatus, collectionCode: liveCode } = useRealtimeOrder(
    order?.id ?? "",
    order?.status ?? "pending_payment",
    order?.collectionCode ?? null,
  );

  if (!hydrated) return null;

  if (!order) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-3 p-6 text-center">
        <span className="text-4xl">🔎</span>
        <h1 className="text-lg font-bold">Order not found</h1>
        <p className="text-xs text-muted">
          We couldn&apos;t find an order with identifier &quot;{orderId}&quot;.
        </p>
        <Link
          href="/orders"
          className="mt-2 rounded-[8px] bg-accent px-4 py-2 text-xs font-semibold text-accent-fg"
        >
          View All Orders
        </Link>
      </div>
    );
  }

  const activeStatus = liveStatus || order.status;
  const activeCode = liveCode || order.collectionCode;

  const steps = PROGRESS_STEPS[order.fulfilment];
  const currentIndex = steps.indexOf(activeStatus);
  const isTerminal =
    activeStatus === "collected" || activeStatus === "delivered" || activeStatus === "refunded";

  // Determine next stage
  let nextStatus: OrderStatusType | null = null;
  if (!isTerminal && currentIndex >= 0 && currentIndex < steps.length - 1) {
    const candidate = steps[currentIndex + 1];
    if (canTransition(activeStatus, candidate, { fulfilment: order.fulfilment, wasPaid: true })) {
      nextStatus = candidate;
    }
  }

  const handleAdvanceStatus = async () => {
    if (!nextStatus) return;
    setAdvancing(true);

    try {
      await fetch(`/api/orders/${order.id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: nextStatus,
          fulfilment: order.fulfilment,
        }),
      });
    } catch (e) {
      console.warn("Backend status update error:", e);
    }

    updateStatus(order.id, nextStatus);
    setAdvancing(false);
  };

  const handleCancelOrder = async () => {
    if (confirm("Are you sure you want to cancel this order?")) {
      try {
        await fetch(`/api/orders/${order.id}/status`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            status: "cancelled",
            fulfilment: order.fulfilment,
          }),
        });
      } catch (e) {
        console.warn("Backend cancel error:", e);
      }
      updateStatus(order.id, "cancelled");
    }
  };

  const dateFormatted = new Date(order.createdAt).toLocaleDateString("en-IN", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div className="flex flex-col gap-4 p-4 pb-16">
      {/* Top Navigation */}
      <div className="flex items-center justify-between">
        <Link
          href="/orders"
          className="inline-flex items-center gap-1 text-xs font-semibold text-muted hover:text-fg"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 20 20"
            fill="currentColor"
            className="size-4"
          >
            <path
              fillRule="evenodd"
              d="M17 10a.75.75 0 0 1-.75.75H5.612l4.158 3.96a.75.75 0 1 1-1.04 1.08l-5.5-5.25a.75.75 0 0 1 0-1.08l5.5-5.25a.75.75 0 1 1 1.04 1.08L5.612 9.25H16.25A.75.75 0 0 1 17 10Z"
              clipRule="evenodd"
            />
          </svg>
          <span>All Orders</span>
        </Link>
        <span className="text-xs font-bold text-accent">
          {order.fulfilment === "pickup" ? "🏪 Store Pickup" : "🛵 Campus Delivery"}
        </span>
      </div>

      {/* Main Status Header Card */}
      <div className="flex flex-col gap-2 rounded-[16px] border border-border bg-surface p-4 shadow-xs">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-muted">Order ID</p>
            <h1 className="text-lg font-extrabold text-fg">{order.id}</h1>
          </div>
          <span className="rounded-full bg-accent/10 px-3 py-1 text-xs font-bold text-accent">
            {STATUS_LABELS[activeStatus]}
          </span>
        </div>
        <p className="text-xs text-muted">
          Placed on {dateFormatted} · {order.itemCount} items · Total: {formatPaise(order.totalPaise)}
        </p>
      </div>

      {/* Pickup Collection Code Banner */}
      {order.fulfilment === "pickup" && activeCode && (
        <div className="flex flex-col items-center gap-2 rounded-[16px] bg-gradient-to-br from-emerald-800 to-teal-900 p-6 text-center text-white shadow-md">
          <span className="rounded-full bg-white/20 px-3 py-0.5 text-xs font-bold uppercase tracking-wider">
            Counter Pickup Code
          </span>
          <p className="text-5xl font-black tracking-widest">{activeCode}</p>
          <div className="my-1 flex h-6 items-center gap-1 opacity-70">
            {/* Barcode graphic lines */}
            {[...Array(24)].map((_, i) => (
              <span
                key={i}
                className="inline-block h-full bg-white"
                style={{ width: i % 3 === 0 ? "3px" : "1.5px" }}
              />
            ))}
          </div>
          <p className="text-xs text-emerald-100">
            Show this code at {store.name} counter to collect your packed order.
          </p>
        </div>
      )}

      {/* Delivery Rider Card */}
      {order.fulfilment === "delivery" && activeStatus !== "delivered" && (
        <div className="flex items-center justify-between rounded-[16px] border border-border bg-surface p-4 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="flex size-11 items-center justify-center rounded-full bg-accent/10 text-2xl">
              🛵
            </div>
            <div>
              <p className="text-xs font-bold text-fg">Rider Assigned: Ramesh K.</p>
              <p className="text-[11px] text-muted">
                {activeStatus === "out_for_delivery" ? "On the way to your hostel" : "Waiting for kitchen/store packing"}
              </p>
            </div>
          </div>
          <a
            href="tel:+919876543210"
            className="flex size-9 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
            title="Call Rider"
          >
            📞
          </a>
        </div>
      )}

      {/* Live Order Timeline */}
      <section className="flex flex-col gap-3 rounded-[16px] border border-border bg-surface p-4 shadow-xs">
        <h2 className="text-xs font-bold uppercase tracking-wider text-muted">
          Order Progress Tracker
        </h2>

        <ol className="relative flex flex-col gap-4 pl-2" aria-label="Order progress">
          {steps.map((step, i) => {
            const isDone = currentIndex >= i;
            const isCurrent = currentIndex === i;

            return (
              <li key={step} className="flex items-start gap-3">
                <div className="relative flex flex-col items-center">
                  <span
                    className={`flex size-6 items-center justify-center rounded-full text-xs font-bold transition-all ${
                      isDone
                        ? "bg-accent text-accent-fg shadow-xs"
                        : "border border-border bg-bg text-muted"
                    } ${isCurrent ? "ring-4 ring-accent/20 animate-pulse" : ""}`}
                  >
                    {isDone ? "✓" : i + 1}
                  </span>
                  {i < steps.length - 1 && (
                    <span
                      className={`h-6 w-0.5 mt-1 ${
                        currentIndex > i ? "bg-accent" : "bg-border"
                      }`}
                    />
                  )}
                </div>

                <div className="flex flex-col">
                  <p
                    className={`text-xs ${
                      isCurrent
                        ? "font-bold text-accent"
                        : isDone
                        ? "font-semibold text-fg"
                        : "text-muted"
                    }`}
                  >
                    {STATUS_LABELS[step]}
                  </p>
                  {isCurrent && (
                    <p className="text-[11px] text-muted">
                      {order.fulfilment === "pickup"
                        ? "Store associates are working on your items."
                        : "Freshly picking and safely packing your order."}
                    </p>
                  )}
                </div>
              </li>
            );
          })}
        </ol>

        {/* Demo Advance Simulation Control */}
        {!isTerminal && (
          <div className="mt-3 flex flex-col gap-2 border-t border-border pt-3">
            <div className="flex items-center justify-between text-[11px] text-muted">
              <span>Demo Live Simulation</span>
              <span>Test State Machine</span>
            </div>
            {nextStatus && (
              <button
                onClick={handleAdvanceStatus}
                disabled={advancing}
                className="flex min-h-10 w-full items-center justify-center gap-2 rounded-[8px] bg-accent/10 text-xs font-bold text-accent transition-all hover:bg-accent hover:text-accent-fg active:scale-[0.98]"
              >
                <span>⚡</span>
                <span>
                  {advancing
                    ? "Updating state..."
                    : `Simulate Next Step: "${STATUS_LABELS[nextStatus]}"`}
                </span>
              </button>
            )}

            {canTransition(activeStatus, "cancelled", { fulfilment: order.fulfilment, wasPaid: true }) && (
              <button
                onClick={handleCancelOrder}
                className="min-h-9 rounded-[8px] text-xs font-semibold text-danger hover:bg-red-500/10"
              >
                Cancel Order
              </button>
            )}
          </div>
        )}
      </section>

      {/* Ordered Items Breakdown */}
      {order.items && order.items.length > 0 && (
        <section className="flex flex-col gap-2 rounded-[16px] border border-border bg-surface p-4 shadow-xs">
          <h2 className="text-xs font-bold uppercase tracking-wider text-muted">
            Items in this order
          </h2>
          <ul className="flex flex-col divide-y divide-border/60">
            {order.items.map((item, idx) => (
              <li key={idx} className="flex items-center justify-between py-2 text-xs">
                <div>
                  <p className="font-semibold text-fg">{item.name}</p>
                  <p className="text-muted">Qty: {item.qty} × {formatPaise(item.unitPricePaise)}</p>
                </div>
                <span className="font-bold text-fg">
                  {formatPaise(item.qty * item.unitPricePaise)}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Store Support */}
      <div className="flex items-center justify-between rounded-[16px] border border-border bg-surface p-4 shadow-xs">
        <div>
          <p className="text-xs font-bold text-fg">Need help with this order?</p>
          <p className="text-[11px] text-muted">Campus Store: {store.phone}</p>
        </div>
        <a
          href={`tel:${store.phone.replace(/\s+/g, "")}`}
          className="rounded-[8px] border border-border bg-bg px-3 py-1.5 text-xs font-semibold text-fg hover:border-accent"
        >
          Call Store
        </a>
      </div>
    </div>
  );
}
