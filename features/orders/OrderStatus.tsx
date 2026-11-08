"use client";

import Link from "next/link";
import { useHydrated } from "@/lib/hooks/useHydrated";
import { formatPaise } from "@/lib/format/money";
import { findPlaceholderOrder } from "@/lib/placeholder/orders";
import { store } from "@/lib/placeholder/catalog";
import { DELIVERY_TRACKER_STEPS, STATUS_LABELS } from "./statusLabels";
import { canTransition, type OrderStatus as OrderStatusType } from "./stateMachine";
import { useOrdersStore } from "./ordersStore";
import { useRealtimeOrder } from "@/lib/supabase/useRealtimeOrder";
import { DeliveryTrackerMap } from "@/components/orders/DeliveryTrackerMap";

export function OrderStatus({ orderId }: { orderId: string }) {
  const hydrated = useHydrated();
  const placed = useOrdersStore((s) => s.placed);
  const updateStatus = useOrdersStore((s) => s.updateStatus);

  const order = placed.find((o) => o.id === orderId) ?? findPlaceholderOrder(orderId);

  const { status: liveStatus } = useRealtimeOrder(
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

  // Determine delivery step index: 0 = Paid, 1 = Packed, 2 = Out for delivery, 3 = Delivered
  const getDeliveryStepIndex = (status: OrderStatusType): number => {
    switch (status) {
      case "pending_payment":
        return -1;
      case "paid":
      case "received":
        return 0; // Paid
      case "packed":
      case "ready_for_pickup":
        return 1; // Packed
      case "out_for_delivery":
        return 2; // Out for delivery
      case "delivered":
        return 3; // Delivered
      default:
        return -1;
    }
  };

  const deliveryStepIndex = getDeliveryStepIndex(activeStatus);
  const isPickupDone = order.fulfilment === "pickup" && activeStatus === "collected";

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

  const parsedAddress = order.address || "Doorstep Store Delivery Address";

  return (
    <div className="flex flex-col gap-4 p-4 pb-20">
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
          {order.fulfilment === "pickup" ? "🏪 Store Owner Pickup" : "🛵 Store Delivery"}
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

      {/* STORE PICKUP FLOW */}
      {order.fulfilment === "pickup" && (
        <>
          {isPickupDone ? (
            /* When order pickup is done: Remove order tracker completely, show completion */
            <div className="flex flex-col items-center gap-2.5 rounded-[16px] border border-emerald-500/25 bg-emerald-500/10 p-6 text-center shadow-xs">
              <span className="text-4xl">🎉</span>
              <h2 className="text-base font-bold text-emerald-800 dark:text-emerald-300">
                Order Completed · Collected from Store Owner
              </h2>
              <p className="text-xs text-muted max-w-sm">
                Your order has been handed over directly by the store owner at {store.name}. Thank you for shopping with us!
              </p>
            </div>
          ) : (
            /* Active pickup before collection: No counter code, given directly by owner */
            <div className="flex flex-col gap-3 rounded-[16px] border border-border bg-surface p-4 shadow-xs">
              <div className="flex items-start gap-3">
                <div className="flex size-11 shrink-0 items-center justify-center rounded-full bg-emerald-600/10 text-2xl text-emerald-700 dark:text-emerald-400">
                  🏪
                </div>
                <div>
                  <p className="text-xs font-bold text-fg">Direct Pickup by Store Owner</p>
                  <p className="text-[11px] text-muted mt-0.5">
                    There is no separate counter. Your order is packed and will be handed over to you directly by the store owner upon your arrival at {store.name}.
                  </p>
                </div>
              </div>

              <div className="flex flex-col gap-1 rounded-[10px] bg-neutral-50 p-3 text-xs text-muted dark:bg-neutral-800/60">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-fg">Pickup Address:</span>
                  <span className="text-right text-fg">{store.address}</span>
                </div>
                <div className="flex items-center justify-between pt-1">
                  <span>Store Timings:</span>
                  <span className="font-medium text-fg">{store.timings}</span>
                </div>
                <div className="flex items-center justify-between pt-1">
                  <span>Store Helpline:</span>
                  <a href={`tel:${store.phone.replace(/\s+/g, "")}`} className="font-bold text-accent hover:underline">
                    {store.phone}
                  </a>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* STORE DELIVERY FLOW */}
      {order.fulfilment === "delivery" && (
        <>
          {/* 1. Live Driver GPS Tracking Map */}
          <DeliveryTrackerMap
            status={activeStatus}
            deliveryAddress={parsedAddress}
            driverName="Ramesh Kumar"
            driverPhone={store.phone}
          />

          {/* 2. Order Progress Tracker (Paid -> Packed -> Out for delivery -> Delivered) */}
          <section className="flex flex-col gap-3 rounded-[16px] border border-border bg-surface p-4 shadow-xs">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-bold uppercase tracking-wider text-muted">
                Order Progress Tracker
              </h2>
              <span className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-400">
                Store Delivery
              </span>
            </div>

            <ol className="relative flex flex-col gap-4 pl-2" aria-label="Order progress">
              {DELIVERY_TRACKER_STEPS.map((step, idx) => {
                const isDone = deliveryStepIndex >= idx;
                const isCurrent = deliveryStepIndex === idx;

                return (
                  <li key={step.key} className="flex items-start gap-3">
                    <div className="relative flex flex-col items-center">
                      <span
                        className={`flex size-6 items-center justify-center rounded-full text-xs font-bold transition-all ${
                          isDone
                            ? "bg-accent text-accent-fg shadow-xs"
                            : "border border-border bg-bg text-muted"
                        } ${isCurrent ? "ring-4 ring-accent/20 animate-pulse" : ""}`}
                      >
                        {isDone ? "✓" : idx + 1}
                      </span>
                      {idx < DELIVERY_TRACKER_STEPS.length - 1 && (
                        <span
                          className={`h-7 w-0.5 mt-1 ${
                            deliveryStepIndex > idx ? "bg-accent" : "bg-border"
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
                        {step.label}
                      </p>
                      <p className="text-[11px] text-muted">
                        {step.description}
                      </p>
                    </div>
                  </li>
                );
              })}
            </ol>
          </section>
        </>
      )}

      {/* Out for delivery notice - cancellation disabled */}
      {order.fulfilment === "delivery" && activeStatus === "out_for_delivery" && (
        <div className="flex items-start gap-2.5 rounded-[12px] border border-amber-500/20 bg-amber-500/10 p-3.5 text-xs text-amber-800 dark:text-amber-300">
          <span className="text-lg">🛵</span>
          <div>
            <p className="font-bold">Order Out for Delivery</p>
            <p className="text-[11px] text-amber-700 dark:text-amber-400 mt-0.5">
              The driver has picked up your grocery order and is heading to your doorstep. As per store policy, orders cannot be cancelled once dispatched.
            </p>
          </div>
        </div>
      )}

      {/* Cancellation option if eligible */}
      {canTransition(activeStatus, "cancelled", { fulfilment: order.fulfilment, wasPaid: true }) && (
        <button
          onClick={handleCancelOrder}
          className="min-h-10 w-full rounded-[10px] border border-border bg-surface text-xs font-semibold text-danger hover:bg-red-500/10 active:scale-[0.99]"
        >
          Cancel Order
        </button>
      )}

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
                  <p className="text-muted">
                    Qty: {item.qty} × {formatPaise(item.unitPricePaise)}
                  </p>
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
          <p className="text-xs font-bold text-fg">Need help with your grocery order?</p>
          <p className="text-[11px] text-muted">{store.name}: {store.phone}</p>
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
