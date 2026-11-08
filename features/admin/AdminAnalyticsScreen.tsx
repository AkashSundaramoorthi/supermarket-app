"use client";

import Link from "next/link";
import { useState, useMemo, useEffect } from "react";
import { formatPaise } from "@/lib/format/money";
import { store } from "@/lib/placeholder/catalog";
import { useOrdersStore } from "@/features/orders/ordersStore";
import { placeholderOrders, type PlaceholderOrder } from "@/lib/placeholder/orders";
import { computeAdminAnalytics } from "@/lib/analytics/adminMetrics";
import { STATUS_LABELS } from "@/features/orders/statusLabels";
import { useStoreSettings } from "@/lib/stores/useStoreSettings";
import { exportOrdersToCsv, exportOrdersToJson, generateOrdersCsv } from "@/lib/analytics/exportOrders";
import type { OrderStatus } from "@/features/orders/stateMachine";

export function AdminAnalyticsScreen() {
  const placed = useOrdersStore((s) => s.placed);
  const updateOrderStatus = useOrdersStore((s) => s.updateStatus);

  const deliveryEnabled = useStoreSettings((s) => s.deliveryEnabled);
  const setDeliveryStatus = useStoreSettings((s) => s.setDeliveryStatus);
  const fetchSettings = useStoreSettings((s) => s.fetchSettings);

  const [tab, setTab] = useState<"overview" | "orders" | "inventory" | "promotions">("overview");
  const [activatedPromos, setActivatedPromos] = useState<Record<string, boolean>>({
    "promo-3": true, // pre-activated demo promo
  });
  const [togglingDelivery, setTogglingDelivery] = useState(false);
  const [deliveryMessage, setDeliveryMessage] = useState("");

  // Search & Filter States
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [fulfilmentFilter, setFulfilmentFilter] = useState<"all" | "pickup" | "delivery">("all");
  const [paymentFilter, setPaymentFilter] = useState<"all" | "upi" | "cod">("all");
  const [dateRangeFilter, setDateRangeFilter] = useState<"all" | "today" | "7days" | "30days">("all");
  const [sortBy, setSortBy] = useState<"newest" | "oldest" | "highest" | "lowest">("newest");
  const [copiedToast, setCopiedToast] = useState(false);
  const [referenceTime] = useState<number>(() => Date.now());

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

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

  const handleToggleDelivery = async () => {
    setTogglingDelivery(true);
    setDeliveryMessage("");
    const nextState = !deliveryEnabled;
    const ok = await setDeliveryStatus(
      nextState,
      nextState ? "" : "Owner stopped deliveries (No delivery partner available)"
    );
    if (ok) {
      setDeliveryMessage(
        nextState
          ? "Deliveries resumed! Customer app delivery option is now active."
          : "Deliveries stopped! Delivery option is now greyed out in all customer apps."
      );
      setTimeout(() => setDeliveryMessage(""), 4000);
    }
    setTogglingDelivery(false);
  };

  const advanceOrderStatus = async (order: PlaceholderOrder) => {
    let nextStatus: OrderStatus | null = null;
    if (order.status === "paid" || order.status === "received") {
      nextStatus = "packed";
    } else if (order.status === "packed") {
      nextStatus = order.fulfilment === "delivery" ? "out_for_delivery" : "ready_for_pickup";
    } else if (order.status === "out_for_delivery") {
      nextStatus = "delivered";
    } else if (order.status === "ready_for_pickup") {
      nextStatus = "collected";
    }

    if (!nextStatus) return;

    // Update in local store
    updateOrderStatus(order.id, nextStatus);

    // Optionally notify server
    try {
      await fetch(`/api/orders/${order.id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus, fulfilment: order.fulfilment, wasPaid: true }),
      });
    } catch {
      // Continue locally
    }
  };

  // Filtered & Sorted Orders Engine
  const filteredOrders = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const oneDay = 24 * 60 * 60 * 1000;

    const list = metrics.allOrders.filter((o) => {
      // 1. Search Query Match
      if (q) {
        const matchesId = o.id.toLowerCase().includes(q);
        const matchesAddress = o.address ? o.address.toLowerCase().includes(q) : false;
        const matchesCode = o.collectionCode ? o.collectionCode.toLowerCase().includes(q) : false;
        const matchesPayment = o.paymentMethod.toLowerCase().includes(q);
        const matchesItem = o.items ? o.items.some((item) => item.name.toLowerCase().includes(q)) : false;

        if (!matchesId && !matchesAddress && !matchesCode && !matchesPayment && !matchesItem) {
          return false;
        }
      }

      // 2. Status Filter Match
      const isCompleted = o.status === "delivered" || o.status === "collected";
      if (statusFilter === "active" && isCompleted) return false;
      if (statusFilter === "completed" && !isCompleted) return false;
      if (statusFilter !== "all" && statusFilter !== "active" && statusFilter !== "completed") {
        if (o.status !== statusFilter) return false;
      }

      // 3. Fulfilment Filter Match
      if (fulfilmentFilter !== "all" && o.fulfilment !== fulfilmentFilter) {
        return false;
      }

      // 4. Payment Method Filter Match
      if (paymentFilter !== "all" && o.paymentMethod !== paymentFilter) {
        return false;
      }

      // 5. Date Range Filter Match
      if (dateRangeFilter !== "all" && referenceTime > 0) {
        const orderTime = new Date(o.createdAt).getTime();
        if (dateRangeFilter === "today" && referenceTime - orderTime > oneDay) return false;
        if (dateRangeFilter === "7days" && referenceTime - orderTime > 7 * oneDay) return false;
        if (dateRangeFilter === "30days" && referenceTime - orderTime > 30 * oneDay) return false;
      }

      return true;
    });

    // 6. Sorting
    return [...list].sort((a, b) => {
      if (sortBy === "newest") {
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
      if (sortBy === "oldest") {
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      }
      if (sortBy === "highest") {
        return b.totalPaise - a.totalPaise;
      }
      if (sortBy === "lowest") {
        return a.totalPaise - b.totalPaise;
      }
      return 0;
    });
  }, [metrics.allOrders, searchQuery, statusFilter, fulfilmentFilter, paymentFilter, dateRangeFilter, sortBy, referenceTime]);

  const filteredTotalValue = useMemo(() => {
    return filteredOrders.reduce((sum, o) => sum + o.totalPaise, 0);
  }, [filteredOrders]);

  const isFiltered = Boolean(
    searchQuery ||
    statusFilter !== "all" ||
    fulfilmentFilter !== "all" ||
    paymentFilter !== "all" ||
    dateRangeFilter !== "all" ||
    sortBy !== "newest"
  );

  const resetFilters = () => {
    setSearchQuery("");
    setStatusFilter("all");
    setFulfilmentFilter("all");
    setPaymentFilter("all");
    setDateRangeFilter("all");
    setSortBy("newest");
  };

  const handleExportCsv = () => {
    exportOrdersToCsv(filteredOrders, "quickmart-orders-export");
  };

  const handleExportJson = () => {
    exportOrdersToJson(filteredOrders, "quickmart-orders-analysis");
  };

  const handleCopyCsv = async () => {
    const csv = generateOrdersCsv(filteredOrders);
    try {
      await navigator.clipboard.writeText(csv);
      setCopiedToast(true);
      setTimeout(() => setCopiedToast(false), 3000);
    } catch {
      // Fallback
    }
  };

  return (
    <div className="flex flex-col gap-6 p-4 pb-24 md:p-8 max-w-7xl mx-auto">
      {/* Top Owner Header */}
      <header className="flex flex-col gap-4 rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="flex size-12 items-center justify-center rounded-2xl bg-emerald-600 text-2xl text-white font-black shadow-md">
              🏪
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-extrabold tracking-tight text-neutral-900 dark:text-neutral-50">
                  Store Operations Command
                </h1>
                <span className="flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-bold text-emerald-700 dark:text-emerald-400">
                  <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
                  Live Operational
                </span>
              </div>
              <p className="text-xs font-medium text-neutral-500 dark:text-neutral-400">
                {store.name} · {store.address}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="rounded-xl border border-neutral-300 bg-neutral-50 px-3.5 py-2 text-xs font-bold text-neutral-700 transition-colors hover:border-emerald-600 hover:text-emerald-700 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-200"
            >
              ← Back to Customer Storefront
            </Link>
          </div>
        </div>

        {/* OWNER DELIVERY SWITCH */}
        <div className={`flex flex-col md:flex-row md:items-center justify-between gap-4 rounded-xl border p-4 transition-all ${
          deliveryEnabled
            ? "border-emerald-300 bg-emerald-50/70 dark:border-emerald-900/60 dark:bg-emerald-950/30"
            : "border-red-300 bg-red-50/80 dark:border-red-900/60 dark:bg-red-950/40"
        }`}>
          <div className="flex items-start gap-3">
            <span className="text-2xl mt-0.5">{deliveryEnabled ? "🛵" : "🛑"}</span>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-black uppercase tracking-wider text-neutral-900 dark:text-neutral-100">
                  Store Delivery Status:
                </span>
                {deliveryEnabled ? (
                  <span className="flex items-center gap-1.5 rounded-full bg-emerald-600 px-2.5 py-0.5 text-xs font-black text-white shadow-xs">
                    <span className="size-2 rounded-full bg-white animate-pulse" />
                    ONLINE & ACCEPTING DELIVERIES
                  </span>
                ) : (
                  <span className="flex items-center gap-1.5 rounded-full bg-red-600 px-2.5 py-0.5 text-xs font-black text-white shadow-xs">
                    <span className="size-2 rounded-full bg-white" />
                    STOPPED (NO DRIVERS)
                  </span>
                )}
              </div>
              <p className="mt-1 text-xs text-neutral-600 dark:text-neutral-300 leading-normal">
                {deliveryEnabled
                  ? "Customers can place both Home Delivery and Store Pickup orders. Delivery option is active in user apps."
                  : "Home delivery is GREYED OUT and blocked in all customer apps. Shoppers can only place Store Owner Pickup orders."}
              </p>
              {deliveryMessage && (
                <p className="mt-2 text-xs font-bold text-neutral-900 dark:text-neutral-100">
                  ✨ {deliveryMessage}
                </p>
              )}
            </div>
          </div>

          <button
            onClick={handleToggleDelivery}
            disabled={togglingDelivery}
            className={`min-h-11 shrink-0 rounded-xl px-4 py-2.5 text-xs font-black uppercase tracking-wider shadow-md transition-all active:scale-[0.98] ${
              deliveryEnabled
                ? "bg-red-600 text-white hover:bg-red-700"
                : "bg-emerald-600 text-white hover:bg-emerald-700"
            }`}
          >
            {togglingDelivery
              ? "Updating..."
              : deliveryEnabled
              ? "🛑 Stop Deliveries (No Drivers)"
              : "▶️ Resume Store Deliveries"}
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-1.5 rounded-xl border border-neutral-200 bg-neutral-100 p-1.5 text-xs font-bold dark:border-neutral-800 dark:bg-neutral-800/80">
          <button
            onClick={() => setTab("overview")}
            className={`min-h-10 rounded-lg transition-all ${
              tab === "overview"
                ? "bg-white text-emerald-800 shadow-sm dark:bg-neutral-900 dark:text-emerald-400"
                : "text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-100"
            }`}
          >
            📊 Overview & Sales
          </button>
          <button
            onClick={() => setTab("orders")}
            className={`min-h-10 rounded-lg transition-all ${
              tab === "orders"
                ? "bg-white text-emerald-800 shadow-sm dark:bg-neutral-900 dark:text-emerald-400"
                : "text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-100"
            }`}
          >
            📋 Orders & Export ({metrics.allOrders.length})
          </button>
          <button
            onClick={() => setTab("inventory")}
            className={`min-h-10 rounded-lg transition-all ${
              tab === "inventory"
                ? "bg-white text-emerald-800 shadow-sm dark:bg-neutral-900 dark:text-emerald-400"
                : "text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-100"
            }`}
          >
            📦 Stock & Restock
          </button>
          <button
            onClick={() => setTab("promotions")}
            className={`min-h-10 rounded-lg transition-all ${
              tab === "promotions"
                ? "bg-white text-emerald-800 shadow-sm dark:bg-neutral-900 dark:text-emerald-400"
                : "text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-100"
            }`}
          >
            🚀 Promotions & Surges
          </button>
        </div>
      </header>

      {/* 4 HIGH-CONTRAST KPI METRIC TILES */}
      <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-4">
        <div className="flex flex-col justify-between gap-2 rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-black uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
              Gross Revenue
            </span>
            <span className="text-base">💰</span>
          </div>
          <span className="text-2xl font-black tracking-tight text-emerald-700 dark:text-emerald-400">
            {formatPaise(metrics.grossRevenuePaise)}
          </span>
          <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
            Direct UPI & COD Settlements
          </span>
        </div>

        <div className="flex flex-col justify-between gap-2 rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-black uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
              Total Orders
            </span>
            <span className="text-base">🧾</span>
          </div>
          <span className="text-2xl font-black tracking-tight text-neutral-900 dark:text-neutral-100">
            {metrics.totalOrders}
          </span>
          <span className="text-[11px] font-semibold text-neutral-500 dark:text-neutral-400">
            {metrics.completedOrdersCount} fulfilled · {metrics.activeOrdersCount} in progress
          </span>
        </div>

        <div className="flex flex-col justify-between gap-2 rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-black uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
              Active Queue
            </span>
            <span className="text-base">⚡</span>
          </div>
          <span className="text-2xl font-black tracking-tight text-amber-600 dark:text-amber-400">
            {metrics.activeOrdersCount}
          </span>
          <span className="text-[11px] font-semibold text-amber-600 dark:text-amber-400">
            Waiting for pack or delivery
          </span>
        </div>

        <div className="flex flex-col justify-between gap-2 rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-black uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
              Avg Order Value
            </span>
            <span className="text-base">🛒</span>
          </div>
          <span className="text-2xl font-black tracking-tight text-neutral-900 dark:text-neutral-100">
            {formatPaise(metrics.aovPaise)}
          </span>
          <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
            Healthy Supermarket Basket
          </span>
        </div>
      </div>

      {/* TAB 1: OVERVIEW & OPERATIONAL AUDIT */}
      {tab === "overview" && (
        <div className="flex flex-col gap-5">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="flex flex-col gap-3 rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
              <div className="flex items-center justify-between">
                <h2 className="text-xs font-black uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
                  Fulfilment Method Split
                </h2>
                <span className="text-xs font-bold text-neutral-900 dark:text-neutral-100">
                  {metrics.fulfilment.pickupPercentage}% Pickup · {metrics.fulfilment.deliveryPercentage}% Delivery
                </span>
              </div>

              <div className="flex h-3 w-full overflow-hidden rounded-full bg-neutral-100 dark:bg-neutral-800">
                <div
                  className="bg-emerald-600 transition-all"
                  style={{ width: `${metrics.fulfilment.pickupPercentage}%` }}
                  title="Store Pickup"
                />
                <div
                  className="bg-teal-500 transition-all"
                  style={{ width: `${metrics.fulfilment.deliveryPercentage}%` }}
                  title="Store Delivery"
                />
              </div>

              <div className="flex justify-between text-xs text-neutral-600 dark:text-neutral-300 pt-1 font-medium">
                <span className="flex items-center gap-1.5">
                  <span className="size-2 rounded-full bg-emerald-600" />
                  <span>Store Pickup: {metrics.fulfilment.pickupCount} orders (Zero driver cost)</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="size-2 rounded-full bg-teal-500" />
                  <span>Delivery: {metrics.fulfilment.deliveryCount} orders</span>
                </span>
              </div>
            </div>

            <div className="flex flex-col gap-3 rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
              <h2 className="text-xs font-black uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
                Payment Distribution (100% Direct)
              </h2>
              <div className="grid grid-cols-2 gap-3 text-center">
                <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-3 dark:border-neutral-800 dark:bg-neutral-800/50">
                  <p className="text-xs font-bold text-neutral-500 dark:text-neutral-400">⚡ Direct UPI</p>
                  <p className="mt-1 text-xl font-extrabold text-neutral-900 dark:text-neutral-100">{metrics.payments.upi}</p>
                  <p className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">Instant UTR Verified</p>
                </div>
                <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-3 dark:border-neutral-800 dark:bg-neutral-800/50">
                  <p className="text-xs font-bold text-neutral-500 dark:text-neutral-400">💵 Cash / COD</p>
                  <p className="mt-1 text-xl font-extrabold text-neutral-900 dark:text-neutral-100">{metrics.payments.cod}</p>
                  <p className="text-[10px] font-semibold text-neutral-500 dark:text-neutral-400">Collected at counter/door</p>
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-3 rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-black uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
                Top Demand Groceries (Fast Moving)
              </h2>
              <span className="text-xs font-medium text-neutral-500">Ranked by volume sold</span>
            </div>

            <div className="flex flex-col divide-y divide-neutral-100 dark:divide-neutral-800">
              {metrics.topProducts.map((p, idx) => (
                <div key={p.name} className="flex items-center justify-between py-3 text-xs">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="flex size-6 items-center justify-center rounded-full bg-neutral-100 font-bold text-[11px] text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300">
                      #{idx + 1}
                    </span>
                    <span className="truncate font-bold text-neutral-900 dark:text-neutral-100">{p.name}</span>
                  </div>
                  <div className="flex items-center gap-4 shrink-0">
                    <span className="font-medium text-neutral-500 dark:text-neutral-400">{p.qty} sold</span>
                    <span className="font-extrabold text-emerald-700 dark:text-emerald-400">{formatPaise(p.revenuePaise)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: LIVE ORDERS FEED, SEARCH, ADVANCED FILTERS & DATA EXPORT */}
      {/* ========================================================================= */}
      {tab === "orders" && (
        <div className="flex flex-col gap-5">
          {/* Top Operational Bar: Title, Search & Data Export Controls */}
          <div className="flex flex-col gap-4 rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-black tracking-tight text-neutral-900 dark:text-neutral-100">
                  Order Management & Data Analysis Console
                </h2>
                <p className="text-xs text-neutral-500 dark:text-neutral-400">
                  Search, filter, inspect, and export full order transactions for financial and operational analysis.
                </p>
              </div>

              {/* Data Export Action Buttons */}
              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={handleExportCsv}
                  className="flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3.5 py-2 text-xs font-bold text-white shadow-xs transition-transform hover:bg-emerald-700 active:scale-95"
                  title="Download filtered orders as CSV for Excel / Google Sheets"
                >
                  <span>📥</span>
                  <span>Export CSV</span>
                </button>

                <button
                  onClick={handleExportJson}
                  className="flex items-center gap-1.5 rounded-xl border border-neutral-300 bg-neutral-50 px-3.5 py-2 text-xs font-bold text-neutral-700 shadow-2xs transition-colors hover:border-emerald-600 hover:text-emerald-700 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-200"
                  title="Download raw structured data as JSON for Python / BI analysis"
                >
                  <span>📊</span>
                  <span>Export JSON</span>
                </button>

                <button
                  onClick={handleCopyCsv}
                  className="flex items-center gap-1.5 rounded-xl border border-neutral-300 bg-neutral-50 px-3.5 py-2 text-xs font-bold text-neutral-700 shadow-2xs transition-colors hover:border-emerald-600 hover:text-emerald-700 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-200"
                  title="Copy CSV to clipboard to paste directly into Excel or AI notebooks"
                >
                  <span>📋</span>
                  <span>{copiedToast ? "✓ Copied!" : "Copy CSV"}</span>
                </button>
              </div>
            </div>

            {/* SEARCH INPUT BAR */}
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400">
                🔍
              </span>
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by Order ID, item name (e.g. Milk, Noodles), address, or pickup code..."
                className="w-full rounded-xl border border-neutral-200 bg-neutral-50 pl-10 pr-10 py-2.5 text-xs font-medium text-neutral-900 placeholder:text-neutral-400 focus:border-emerald-600 focus:bg-white focus:outline-none dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200"
                >
                  ✕
                </button>
              )}
            </div>

            {/* ADVANCED FILTER TOOLBAR */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5 pt-1 text-xs">
              {/* Filter 1: Order Status */}
              <div>
                <label className="mb-1 block text-[10px] font-black uppercase tracking-wider text-neutral-500">
                  Status
                </label>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full rounded-lg border border-neutral-200 bg-neutral-50 px-2.5 py-1.5 font-bold text-neutral-800 focus:border-emerald-600 focus:outline-none dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-200"
                >
                  <option value="all">All Statuses</option>
                  <option value="active">⚡ Active (In Progress)</option>
                  <option value="completed">✓ Fulfilled (Completed)</option>
                  <option value="paid">Paid</option>
                  <option value="packed">Packed</option>
                  <option value="out_for_delivery">Out for Delivery</option>
                  <option value="ready_for_pickup">Ready for Pickup</option>
                  <option value="delivered">Delivered</option>
                  <option value="collected">Collected</option>
                </select>
              </div>

              {/* Filter 2: Fulfilment Type */}
              <div>
                <label className="mb-1 block text-[10px] font-black uppercase tracking-wider text-neutral-500">
                  Fulfilment
                </label>
                <select
                  value={fulfilmentFilter}
                  onChange={(e) => setFulfilmentFilter(e.target.value as "all" | "pickup" | "delivery")}
                  className="w-full rounded-lg border border-neutral-200 bg-neutral-50 px-2.5 py-1.5 font-bold text-neutral-800 focus:border-emerald-600 focus:outline-none dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-200"
                >
                  <option value="all">All Methods</option>
                  <option value="pickup">🏪 Store Owner Pickup</option>
                  <option value="delivery">🛵 Store Delivery</option>
                </select>
              </div>

              {/* Filter 3: Payment Method */}
              <div>
                <label className="mb-1 block text-[10px] font-black uppercase tracking-wider text-neutral-500">
                  Payment
                </label>
                <select
                  value={paymentFilter}
                  onChange={(e) => setPaymentFilter(e.target.value as "all" | "upi" | "cod")}
                  className="w-full rounded-lg border border-neutral-200 bg-neutral-50 px-2.5 py-1.5 font-bold text-neutral-800 focus:border-emerald-600 focus:outline-none dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-200"
                >
                  <option value="all">All Payments</option>
                  <option value="upi">⚡ Direct UPI</option>
                  <option value="cod">💵 Cash on Delivery</option>
                </select>
              </div>

              {/* Filter 4: Date Range */}
              <div>
                <label className="mb-1 block text-[10px] font-black uppercase tracking-wider text-neutral-500">
                  Time Period
                </label>
                <select
                  value={dateRangeFilter}
                  onChange={(e) => setDateRangeFilter(e.target.value as "all" | "today" | "7days" | "30days")}
                  className="w-full rounded-lg border border-neutral-200 bg-neutral-50 px-2.5 py-1.5 font-bold text-neutral-800 focus:border-emerald-600 focus:outline-none dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-200"
                >
                  <option value="all">All Time</option>
                  <option value="today">Today</option>
                  <option value="7days">Last 7 Days</option>
                  <option value="30days">Last 30 Days</option>
                </select>
              </div>

              {/* Filter 5: Sort By */}
              <div>
                <label className="mb-1 block text-[10px] font-black uppercase tracking-wider text-neutral-500">
                  Sort Order
                </label>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as "newest" | "oldest" | "highest" | "lowest")}
                  className="w-full rounded-lg border border-neutral-200 bg-neutral-50 px-2.5 py-1.5 font-bold text-neutral-800 focus:border-emerald-600 focus:outline-none dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-200"
                >
                  <option value="newest">🕒 Newest First</option>
                  <option value="oldest">⏳ Oldest First</option>
                  <option value="highest">💰 Highest Amount</option>
                  <option value="lowest">🪙 Lowest Amount</option>
                </select>
              </div>
            </div>

            {/* Results Counter & Active Filter Strip */}
            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-neutral-100 pt-3 text-xs dark:border-neutral-800">
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-neutral-900 dark:text-neutral-100">
                  Showing {filteredOrders.length} of {metrics.allOrders.length} orders
                </span>
                <span className="text-neutral-400">·</span>
                <span className="font-bold text-emerald-700 dark:text-emerald-400">
                  Total Value: {formatPaise(filteredTotalValue)}
                </span>
              </div>

              {isFiltered && (
                <button
                  onClick={resetFilters}
                  className="rounded-lg bg-neutral-100 px-2.5 py-1 text-xs font-bold text-neutral-600 hover:bg-neutral-200 hover:text-neutral-900 dark:bg-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-700"
                >
                  ✕ Clear All Filters
                </button>
              )}
            </div>
          </div>

          {/* ORDERS LIST */}
          <div className="flex flex-col gap-4">
            {filteredOrders.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-neutral-200 bg-white p-12 text-center shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
                <span className="text-4xl">🔍</span>
                <h3 className="text-base font-extrabold text-neutral-900 dark:text-neutral-100">
                  No orders matched your search or filters
                </h3>
                <p className="text-xs text-neutral-500 max-w-sm">
                  Try adjusting your search query, clearing status filters, or resetting the date range.
                </p>
                <button
                  onClick={resetFilters}
                  className="mt-2 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-emerald-700"
                >
                  Reset All Filters
                </button>
              </div>
            ) : (
              filteredOrders.map((order) => {
                const isDelivered = order.status === "delivered" || order.status === "collected";

                return (
                  <div
                    key={order.id}
                    className="flex flex-col gap-3.5 rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm dark:border-neutral-800 dark:bg-neutral-900"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-base font-extrabold text-neutral-900 dark:text-neutral-50">
                            Order #{order.id}
                          </span>
                          <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${
                            order.fulfilment === "pickup"
                              ? "bg-blue-500/10 text-blue-700 dark:text-blue-400"
                              : "bg-purple-500/10 text-purple-700 dark:text-purple-400"
                          }`}>
                            {order.fulfilment === "pickup" ? "🏪 Store Owner Pickup" : "🛵 Store Delivery"}
                          </span>
                        </div>
                        <p className="mt-0.5 text-xs text-neutral-500 dark:text-neutral-400">
                          {new Date(order.createdAt).toLocaleString("en-IN", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className={`rounded-full px-3 py-1 text-xs font-black ${
                          order.status === "delivered" || order.status === "collected"
                            ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400"
                            : order.status === "out_for_delivery"
                            ? "bg-purple-500/15 text-purple-700 dark:text-purple-400"
                            : "bg-amber-500/15 text-amber-700 dark:text-amber-400"
                        }`}>
                          {STATUS_LABELS[order.status]}
                        </span>
                      </div>
                    </div>

                    {/* Items detail list */}
                    <div className="rounded-xl border border-neutral-100 bg-neutral-50 p-3.5 text-xs dark:border-neutral-800 dark:bg-neutral-800/40">
                      <p className="mb-2 font-black text-[11px] uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
                        Items Basket ({order.itemCount} items)
                      </p>
                      {order.items && order.items.length > 0 ? (
                        <ul className="flex flex-col divide-y divide-neutral-200/60 dark:divide-neutral-700/60">
                          {order.items.map((item, i) => (
                            <li key={i} className="flex justify-between py-1.5 font-medium">
                              <span className="text-neutral-900 dark:text-neutral-100">
                                {item.name} × {item.qty}
                              </span>
                              <span className="font-bold text-neutral-900 dark:text-neutral-100">
                                {formatPaise(item.qty * item.unitPricePaise)}
                              </span>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-neutral-500">Standard groceries order</p>
                      )}
                    </div>

                    {order.address && (
                      <div className="rounded-xl bg-neutral-50 p-2.5 text-xs dark:bg-neutral-800/40">
                        <span className="font-bold text-neutral-700 dark:text-neutral-300">Deliver to: </span>
                        <span className="text-neutral-900 dark:text-neutral-100">{order.address}</span>
                      </div>
                    )}

                    {order.collectionCode && (
                      <div className="flex items-center justify-between rounded-xl bg-emerald-500/10 px-3.5 py-2 text-xs text-emerald-800 dark:text-emerald-300">
                        <span className="font-bold">Store Pickup Verification Code:</span>
                        <span className="font-mono font-black text-sm tracking-widest">{order.collectionCode}</span>
                      </div>
                    )}

                    {/* Order Footer & Action buttons */}
                    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-neutral-100 pt-3 text-xs dark:border-neutral-800">
                      <div>
                        <span className="font-bold text-neutral-500 dark:text-neutral-400">Paid via: </span>
                        <span className="font-bold text-neutral-900 dark:text-neutral-100 uppercase">
                          {order.paymentMethod}
                        </span>
                        <span className="mx-2 text-neutral-300">·</span>
                        <span className="text-sm font-black text-emerald-700 dark:text-emerald-400">
                          {formatPaise(order.totalPaise)}
                        </span>
                      </div>

                      {/* State Machine Transition Actions */}
                      {!isDelivered && (
                        <div className="flex items-center gap-2">
                          {(order.status === "paid" || order.status === "received") && (
                            <button
                              onClick={() => advanceOrderStatus(order)}
                              className="rounded-xl bg-emerald-600 px-3.5 py-2 text-xs font-bold text-white shadow-xs hover:bg-emerald-700 active:scale-95"
                            >
                              📦 Mark as Packed
                            </button>
                          )}

                          {order.status === "packed" && order.fulfilment === "delivery" && (
                            <button
                              onClick={() => advanceOrderStatus(order)}
                              className="rounded-xl bg-purple-600 px-3.5 py-2 text-xs font-bold text-white shadow-xs hover:bg-purple-700 active:scale-95"
                            >
                              🛵 Hand Over to Delivery Partner
                            </button>
                          )}

                          {order.status === "packed" && order.fulfilment === "pickup" && (
                            <button
                              onClick={() => advanceOrderStatus(order)}
                              className="rounded-xl bg-blue-600 px-3.5 py-2 text-xs font-bold text-white shadow-xs hover:bg-blue-700 active:scale-95"
                            >
                              🏪 Ready for Pickup Code
                            </button>
                          )}

                          {order.status === "out_for_delivery" && (
                            <button
                              onClick={() => advanceOrderStatus(order)}
                              className="rounded-xl bg-emerald-600 px-3.5 py-2 text-xs font-bold text-white shadow-xs hover:bg-emerald-700 active:scale-95"
                            >
                              🎉 Mark Delivered
                            </button>
                          )}

                          {order.status === "ready_for_pickup" && (
                            <button
                              onClick={() => advanceOrderStatus(order)}
                              className="rounded-xl bg-emerald-600 px-3.5 py-2 text-xs font-bold text-white shadow-xs hover:bg-emerald-700 active:scale-95"
                            >
                              🤝 Hand Over to Customer
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* TAB 3: STOCK HEALTH & RESTOCK ALERTS */}
      {tab === "inventory" && (
        <div className="flex flex-col gap-5">
          <div className="flex flex-col gap-4 rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xs font-black uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
                  Inventory Run-Rate & Restocking Warnings
                </h2>
                <p className="text-xs text-neutral-500 dark:text-neutral-400">
                  Stock levels vs consumption velocity in real time
                </p>
              </div>
              <span className="rounded-full bg-red-500/10 px-3 py-1 text-xs font-extrabold text-red-600 dark:text-red-400">
                2 Critical Reorders
              </span>
            </div>

            <div className="flex flex-col divide-y divide-neutral-100 dark:divide-neutral-800">
              {metrics.inventoryAlerts.map((alert) => (
                <div key={alert.productId} className="flex flex-col gap-1.5 py-3.5 text-xs">
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
                      <span className="text-sm font-extrabold text-neutral-900 dark:text-neutral-100">
                        {alert.name}
                      </span>
                    </div>

                    <span
                      className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${
                        alert.urgency === "critical"
                          ? "bg-red-500/10 text-red-600 dark:text-red-400"
                          : alert.urgency === "warning"
                          ? "bg-amber-500/10 text-amber-700 dark:text-amber-400"
                          : "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                      }`}
                    >
                      {alert.currentStock} units left (Reorder threshold: {alert.reorderLevel})
                    </span>
                  </div>

                  <p className="text-neutral-600 dark:text-neutral-300 pl-4">
                    <strong>Recommended Action:</strong> {alert.action}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-3 rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
            <h2 className="text-xs font-black uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
              Hourly Customer Demand Surge Timeline
            </h2>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {metrics.demandSurges.map((surge, idx) => (
                <div
                  key={idx}
                  className="flex flex-col gap-1.5 rounded-xl border border-neutral-200 bg-neutral-50 p-4 text-xs dark:border-neutral-800 dark:bg-neutral-800/50"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-extrabold text-neutral-900 dark:text-neutral-100">{surge.timeSlot}</span>
                    <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 font-bold text-emerald-700 dark:text-emerald-400">{surge.predictedDemand}</span>
                  </div>
                  <p className="text-neutral-600 dark:text-neutral-300">
                    <strong>High Movement:</strong> {surge.dominantCategory}
                  </p>
                  <p className="text-neutral-600 dark:text-neutral-300">
                    <strong>Store Advice:</strong> {surge.suggestedAction}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: DEMAND-DRIVEN PROMOTIONS & MARKETING PLAN */}
      {tab === "promotions" && (
        <div className="flex flex-col gap-5">
          <div className="flex flex-col gap-1">
            <h2 className="text-xs font-black uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
              Demand-Driven Smart Promotion Plans
            </h2>
            <p className="text-xs text-neutral-500 dark:text-neutral-400">
              Curated marketing bundles and automated promotions to increase shopper basket size and prevent inventory spoilage.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {metrics.promotionPlans.map((plan) => {
              const isLive = activatedPromos[plan.id];
              return (
                <div
                  key={plan.id}
                  className={`flex flex-col justify-between rounded-2xl border p-5 shadow-sm transition-all ${
                    isLive
                      ? "border-emerald-500 bg-emerald-50/50 dark:border-emerald-600 dark:bg-emerald-950/20"
                      : "border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900"
                  }`}
                >
                  <div className="flex flex-col gap-2.5">
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-2 text-sm font-extrabold text-neutral-900 dark:text-neutral-100">
                        <span className="text-2xl">{plan.icon}</span>
                        <span>{plan.title}</span>
                      </span>
                      <span className="rounded-full bg-emerald-600 px-2.5 py-0.5 text-xs font-bold text-white">
                        {plan.expectedUpside}
                      </span>
                    </div>

                    <p className="text-xs text-neutral-600 dark:text-neutral-300 leading-relaxed">
                      {plan.rationale}
                    </p>

                    <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-3 text-xs dark:border-neutral-800 dark:bg-neutral-800/50">
                      <p className="font-extrabold text-emerald-700 dark:text-emerald-400">
                        Offer: {plan.suggestedDiscount}
                      </p>
                      <p className="text-neutral-600 dark:text-neutral-300 mt-1">
                        Target Products: {plan.targetItems.join(" + ")}
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={() => togglePromo(plan.id)}
                    className={`mt-4 flex min-h-11 w-full items-center justify-center rounded-xl text-xs font-black uppercase tracking-wider transition-all active:scale-[0.98] ${
                      isLive
                        ? "border border-neutral-300 bg-neutral-100 text-neutral-800 hover:bg-neutral-200 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100"
                        : "bg-emerald-600 text-white shadow-md hover:bg-emerald-700"
                    }`}
                  >
                    {isLive ? "✓ Promotion Active (Tap to Deactivate)" : "Activate Promotion on Storefront"}
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
