"use client";

import Link from "next/link";
import { useState, useMemo } from "react";
import { formatPaise } from "@/lib/format/money";
import { store } from "@/lib/placeholder/catalog";
import { useOrdersStore } from "@/features/orders/ordersStore";
import { placeholderOrders, type PlaceholderOrder } from "@/lib/placeholder/orders";
import { computeAdminAnalytics } from "@/lib/analytics/adminMetrics";
import { STATUS_LABELS } from "@/features/orders/statusLabels";

export function AdminAnalyticsScreen() {
  const placed = useOrdersStore((s) => s.placed);
  const [tab, setTab] = useState<"overview" | "orders" | "inventory" | "promotions">("overview");
  const [activatedPromos, setActivatedPromos] = useState<Record<string, boolean>>({
    "promo-3": true, // pre-activated demo promo
  });
  const [orderFilter, setOrderFilter] = useState<"all" | "active" | "completed">("all");

  // Merge placed orders from user sessions with placeholder orders
  const orders: PlaceholderOrder[] = useMemo(() => {
    const map = new Map<string, PlaceholderOrder>();
    [...placed, ...placeholderOrders].forEach((o) => {
      if (!map.has(o.id)) map.set(o.id, o);
    });
    return Array.from(map.values());
  }, [placed]);

  const metrics = useMemo(() => computeAdminAnalytics(orders), [orders]);

  const togglePromo = (promoId: string) => {
    setActivatedPromos((prev) => ({
      ...prev,
      [promoId]: !prev[promoId],
    }));
  };

  const filteredOrders = useMemo(() => {
    return metrics.allOrders.filter((o) => {
      const isCompleted = o.status === "delivered" || o.status === "collected";
      if (orderFilter === "active") return !isCompleted;
      if (orderFilter === "completed") return isCompleted;
      return true;
    });
  }, [metrics.allOrders, orderFilter]);

  return (
    <div className="flex flex-col gap-5 p-4 pb-24 md:p-6">
      {/* Top Admin Header */}
      <header className="flex flex-col gap-3 rounded-[16px] border border-border bg-surface p-4 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-3">
            <div className="flex size-11 items-center justify-center rounded-xl bg-accent text-xl text-accent-fg font-black">
              📊
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-bold text-fg">Owner & Store Analytics</h1>
                <span className="flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-700 dark:text-emerald-400">
                  <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Live Store Active
                </span>
              </div>
              <p className="text-xs text-muted">{store.name} · {store.address}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/"
              className="rounded-[8px] border border-border bg-bg px-3 py-1.5 text-xs font-semibold hover:border-accent"
            >
              ← Back to Shop
            </Link>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="grid grid-cols-4 rounded-[10px] border border-border bg-bg p-1 text-xs font-semibold">
          <button
            onClick={() => setTab("overview")}
            className={`min-h-9 rounded-[7px] transition-all ${
              tab === "overview" ? "bg-accent text-accent-fg shadow-xs" : "text-muted hover:text-fg"
            }`}
          >
            Overview
          </button>
          <button
            onClick={() => setTab("orders")}
            className={`min-h-9 rounded-[7px] transition-all ${
              tab === "orders" ? "bg-accent text-accent-fg shadow-xs" : "text-muted hover:text-fg"
            }`}
          >
            Order Feed
          </button>
          <button
            onClick={() => setTab("inventory")}
            className={`min-h-9 rounded-[7px] transition-all ${
              tab === "inventory" ? "bg-accent text-accent-fg shadow-xs" : "text-muted hover:text-fg"
            }`}
          >
            Supply & Stock
          </button>
          <button
            onClick={() => setTab("promotions")}
            className={`min-h-9 rounded-[7px] transition-all ${
              tab === "promotions" ? "bg-accent text-accent-fg shadow-xs" : "text-muted hover:text-fg"
            }`}
          >
            Next Promos 🚀
          </button>
        </div>
      </header>

      {/* TAB 1: OVERVIEW & SALES */}
      {tab === "overview" && (
        <div className="flex flex-col gap-4">
          {/* 4 KPI Cards */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="flex flex-col gap-1 rounded-[14px] border border-border bg-surface p-3.5 shadow-2xs">
              <span className="text-[11px] font-bold uppercase tracking-wider text-muted">Gross Revenue</span>
              <span className="text-xl font-extrabold text-accent">
                {formatPaise(metrics.grossRevenuePaise)}
              </span>
              <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold">
                ↑ +18.4% vs last week
              </span>
            </div>

            <div className="flex flex-col gap-1 rounded-[14px] border border-border bg-surface p-3.5 shadow-2xs">
              <span className="text-[11px] font-bold uppercase tracking-wider text-muted">Total Orders</span>
              <span className="text-xl font-extrabold text-fg">{metrics.totalOrders}</span>
              <span className="text-[10px] text-muted font-medium">
                {metrics.completedOrdersCount} fulfilled · {metrics.activeOrdersCount} live
              </span>
            </div>

            <div className="flex flex-col gap-1 rounded-[14px] border border-border bg-surface p-3.5 shadow-2xs">
              <span className="text-[11px] font-bold uppercase tracking-wider text-muted">Average Order Value</span>
              <span className="text-xl font-extrabold text-fg">{formatPaise(metrics.aovPaise)}</span>
              <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold">
                Healthy shopper basket
              </span>
            </div>

            <div className="flex flex-col gap-1 rounded-[14px] border border-border bg-surface p-3.5 shadow-2xs">
              <span className="text-[11px] font-bold uppercase tracking-wider text-muted">Active Queue</span>
              <span className="text-xl font-extrabold text-amber-600 dark:text-amber-400">
                {metrics.activeOrdersCount}
              </span>
              <span className="text-[10px] text-muted font-medium">Orders in prep / transit</span>
            </div>
          </div>

          {/* Fulfilment & Payment Split */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="flex flex-col gap-3 rounded-[16px] border border-border bg-surface p-4 shadow-xs">
              <div className="flex items-center justify-between">
                <h2 className="text-xs font-bold uppercase tracking-wider text-muted">
                  Fulfilment Method Split
                </h2>
                <span className="text-xs font-bold text-fg">
                  {metrics.fulfilment.pickupPercentage}% Pickup · {metrics.fulfilment.deliveryPercentage}% Delivery
                </span>
              </div>

              {/* Progress bar */}
              <div className="flex h-3 w-full overflow-hidden rounded-full bg-neutral-100 dark:bg-neutral-800">
                <div
                  className="bg-accent transition-all"
                  style={{ width: `${metrics.fulfilment.pickupPercentage}%` }}
                  title="Pickup"
                />
                <div
                  className="bg-teal-500 transition-all"
                  style={{ width: `${metrics.fulfilment.deliveryPercentage}%` }}
                  title="Delivery"
                />
              </div>

              <div className="flex justify-between text-xs text-muted pt-1">
                <span className="flex items-center gap-1.5">
                  <span className="size-2 rounded-full bg-accent" />
                  <span>Pickup: {metrics.fulfilment.pickupCount} orders (Zero delivery cost)</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="size-2 rounded-full bg-teal-500" />
                  <span>Delivery: {metrics.fulfilment.deliveryCount} orders</span>
                </span>
              </div>
            </div>

            <div className="flex flex-col gap-3 rounded-[16px] border border-border bg-surface p-4 shadow-xs">
              <h2 className="text-xs font-bold uppercase tracking-wider text-muted">
                Payment Channel Distribution
              </h2>
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="rounded-[10px] bg-bg p-2.5">
                  <p className="text-[11px] text-muted">📱 UPI</p>
                  <p className="text-sm font-bold text-fg">{metrics.payments.upi}</p>
                  <p className="text-[10px] text-muted">Instant settlement</p>
                </div>
                <div className="rounded-[10px] bg-bg p-2.5">
                  <p className="text-[11px] text-muted">💵 Cash / COD</p>
                  <p className="text-sm font-bold text-fg">{metrics.payments.cod}</p>
                  <p className="text-[10px] text-muted">Paid upon receipt</p>
                </div>
                <div className="rounded-[10px] bg-bg p-2.5">
                  <p className="text-[11px] text-muted">💳 Card</p>
                  <p className="text-sm font-bold text-fg">{metrics.payments.card}</p>
                  <p className="text-[10px] text-muted">Credit / Debit</p>
                </div>
              </div>
            </div>
          </div>

          {/* Top Selling Fast-Moving Products */}
          <div className="flex flex-col gap-3 rounded-[16px] border border-border bg-surface p-4 shadow-xs">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-bold uppercase tracking-wider text-muted">
                Top Demand Groceries (Fastest Moving)
              </h2>
              <span className="text-[11px] text-muted">Ranked by volume sold</span>
            </div>

            <div className="flex flex-col divide-y divide-border/60">
              {metrics.topProducts.map((p, idx) => (
                <div key={p.name} className="flex items-center justify-between py-2.5 text-xs">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="flex size-5 items-center justify-center rounded-full bg-neutral-100 font-bold text-[10px] text-muted dark:bg-neutral-800">
                      #{idx + 1}
                    </span>
                    <span className="truncate font-semibold text-fg">{p.name}</span>
                  </div>
                  <div className="flex items-center gap-4 shrink-0">
                    <span className="text-muted">{p.qty} units sold</span>
                    <span className="font-bold text-fg">{formatPaise(p.revenuePaise)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: WHAT USERS ORDERED */}
      {tab === "orders" && (
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold uppercase tracking-wider text-muted">
              Live Orders Feed ({filteredOrders.length})
            </p>
            <div className="flex gap-1.5 text-xs">
              <button
                onClick={() => setOrderFilter("all")}
                className={`rounded-[6px] px-2.5 py-1 ${orderFilter === "all" ? "bg-accent text-accent-fg font-semibold" : "bg-surface border border-border text-muted"}`}
              >
                All
              </button>
              <button
                onClick={() => setOrderFilter("active")}
                className={`rounded-[6px] px-2.5 py-1 ${orderFilter === "active" ? "bg-accent text-accent-fg font-semibold" : "bg-surface border border-border text-muted"}`}
              >
                Active
              </button>
              <button
                onClick={() => setOrderFilter("completed")}
                className={`rounded-[6px] px-2.5 py-1 ${orderFilter === "completed" ? "bg-accent text-accent-fg font-semibold" : "bg-surface border border-border text-muted"}`}
              >
                Completed
              </button>
            </div>
          </div>

          <div className="flex flex-col gap-3">
            {filteredOrders.map((order) => (
              <div
                key={order.id}
                className="flex flex-col gap-3 rounded-[14px] border border-border bg-surface p-4 shadow-2xs"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-fg">Order #{order.id}</span>
                      <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-[10px] font-semibold text-muted dark:bg-neutral-800">
                        {order.fulfilment === "pickup" ? "🏪 Store Owner Pickup" : "🛵 Store Delivery"}
                      </span>
                    </div>
                    <p className="text-[11px] text-muted">
                      {new Date(order.createdAt).toLocaleString("en-IN", {
                        day: "numeric",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>

                  <span className="rounded-full bg-accent/10 px-2.5 py-0.5 text-xs font-bold text-accent">
                    {STATUS_LABELS[order.status]}
                  </span>
                </div>

                {/* Items detail list */}
                <div className="rounded-[10px] bg-bg p-3 text-xs">
                  <p className="mb-1.5 font-bold text-[11px] uppercase tracking-wider text-muted">
                    Items Basket ({order.itemCount} items)
                  </p>
                  {order.items && order.items.length > 0 ? (
                    <ul className="flex flex-col divide-y divide-border/40">
                      {order.items.map((item, i) => (
                        <li key={i} className="flex justify-between py-1">
                          <span className="text-fg">{item.name} × {item.qty}</span>
                          <span className="font-semibold text-fg">
                            {formatPaise(item.qty * item.unitPricePaise)}
                          </span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-muted">Standard groceries basket</p>
                  )}
                </div>

                {order.address && (
                  <p className="text-xs text-muted">
                    <strong>Deliver to:</strong> {order.address}
                  </p>
                )}

                {order.collectionCode && (
                    <div className="flex items-center justify-between rounded-[8px] bg-emerald-500/10 px-3 py-1.5 text-xs text-emerald-800 dark:text-emerald-300">
                      <span className="font-semibold">Store Pickup Code:</span>
                      <span className="font-black tracking-widest">{order.collectionCode}</span>
                    </div>
                )}

                <div className="flex items-center justify-between border-t border-border pt-2 text-xs">
                  <span className="text-muted">
                    Paid via {order.paymentMethod.toUpperCase()}
                  </span>
                  <span className="text-sm font-extrabold text-fg">
                    Total: {formatPaise(order.totalPaise)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: DEMAND & SUPPLY / RESTOCKING */}
      {tab === "inventory" && (
        <div className="flex flex-col gap-4">
          {/* Inventory Health Alerts */}
          <div className="flex flex-col gap-3 rounded-[16px] border border-border bg-surface p-4 shadow-xs">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xs font-bold uppercase tracking-wider text-muted">
                  Inventory Run-Rate & Restocking Warnings
                </h2>
                <p className="text-xs text-muted">Real-time stock levels vs consumption velocity</p>
              </div>
              <span className="rounded-full bg-red-500/10 px-2.5 py-0.5 text-xs font-bold text-danger">
                2 Critical Reorders
              </span>
            </div>

            <div className="flex flex-col divide-y divide-border/60">
              {metrics.inventoryAlerts.map((alert) => (
                <div key={alert.productId} className="flex flex-col gap-1 py-3 text-xs">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span
                        className={`size-2.5 rounded-full ${
                          alert.urgency === "critical"
                            ? "bg-red-500 animate-pulse"
                            : alert.urgency === "warning"
                            ? "bg-amber-500"
                            : "bg-emerald-500"
                        }`}
                      />
                      <span className="font-bold text-fg">{alert.name}</span>
                    </div>

                    <span
                      className={`rounded-full px-2 py-0.2 text-[10px] font-bold ${
                        alert.urgency === "critical"
                          ? "bg-red-500/10 text-danger"
                          : alert.urgency === "warning"
                          ? "bg-amber-500/10 text-amber-700 dark:text-amber-400"
                          : "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                      }`}
                    >
                      {alert.currentStock} units left (Reorder at {alert.reorderLevel})
                    </span>
                  </div>

                  <p className="text-muted pl-4">
                    <strong>Recommended Action:</strong> {alert.action}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Demand Surge Clock */}
          <div className="flex flex-col gap-3 rounded-[16px] border border-border bg-surface p-4 shadow-xs">
            <h2 className="text-xs font-bold uppercase tracking-wider text-muted">
              Hourly Demand Surge Timeline
            </h2>

            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
              {metrics.demandSurges.map((surge, idx) => (
                <div
                  key={idx}
                  className="flex flex-col gap-1 rounded-[12px] border border-border bg-bg p-3 text-xs"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-fg">{surge.timeSlot}</span>
                    <span className="font-semibold text-accent">{surge.predictedDemand}</span>
                  </div>
                  <p className="text-[11px] text-muted">
                    <strong>High Movement:</strong> {surge.dominantCategory}
                  </p>
                  <p className="text-[11px] text-muted">
                    <strong>Store Advice:</strong> {surge.suggestedAction}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: SMART PROMOTIONS & MARKETING PLAN ("What to promote next") */}
      {tab === "promotions" && (
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <h2 className="text-xs font-bold uppercase tracking-wider text-muted">
              AI Demand-Driven Promotion Plans
            </h2>
            <p className="text-xs text-muted">
              Recommended marketing bundles and automated promotions to maximize profit and prevent stock spoilage.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {metrics.promotionPlans.map((plan) => {
              const isLive = activatedPromos[plan.id];
              return (
                <div
                  key={plan.id}
                  className={`flex flex-col justify-between rounded-[16px] border p-4 shadow-2xs transition-all ${
                    isLive
                      ? "border-accent bg-accent/5 dark:bg-accent/10"
                      : "border-border bg-surface"
                  }`}
                >
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1.5 text-xs font-bold text-fg">
                        <span className="text-xl">{plan.icon}</span>
                        <span>{plan.title}</span>
                      </span>
                      <span className="rounded-full bg-accent px-2 py-0.5 text-[10px] font-bold text-accent-fg">
                        {plan.expectedUpside}
                      </span>
                    </div>

                    <p className="text-xs text-muted leading-relaxed">{plan.rationale}</p>

                    <div className="rounded-[8px] bg-bg p-2 text-xs">
                      <p className="font-semibold text-accent">Offer: {plan.suggestedDiscount}</p>
                      <p className="text-[11px] text-muted">
                        Products: {plan.targetItems.join(" + ")}
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={() => togglePromo(plan.id)}
                    className={`mt-3 flex min-h-10 w-full items-center justify-center rounded-[8px] text-xs font-bold transition-transform active:scale-[0.98] ${
                      isLive
                        ? "bg-neutral-200 text-fg hover:bg-neutral-300 dark:bg-neutral-700"
                        : "bg-accent text-accent-fg shadow-xs hover:opacity-90"
                    }`}
                  >
                    {isLive ? "✓ Promotion Active (Tap to End)" : "Activate Promotion on Storefront"}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
