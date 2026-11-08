"use client";

import Link from "next/link";
import { useState, useMemo, useEffect } from "react";
import { useHydrated } from "@/lib/hooks/useHydrated";
import { formatPaise } from "@/lib/format/money";
import { categories, products, store, type Product } from "@/lib/placeholder/catalog";
import type { Fulfilment } from "@/lib/pricing/calculateCartTotal";
import { ProductPlaceholder } from "@/components/ui/ProductPlaceholder";
import { QtyControl } from "@/features/cart/QtyControl";
import { LocationPicker } from "@/features/location/LocationPicker";
import { usePrefsStore } from "./prefsStore";
import { useStoreSettings } from "@/lib/stores/useStoreSettings";

export function HomeScreen() {
  const hydrated = useHydrated();
  const fulfilment = usePrefsStore((s) => s.fulfilment);

  if (!hydrated) return null;
  if (!fulfilment) return <Onboarding />;
  return <Home fulfilment={fulfilment} />;
}

function Onboarding() {
  const setFulfilment = usePrefsStore((s) => s.setFulfilment);
  const deliveryEnabled = useStoreSettings((s) => s.deliveryEnabled);
  const fetchSettings = useStoreSettings((s) => s.fetchSettings);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  return (
    <section className="flex min-h-[calc(100dvh-6rem)] flex-col justify-center gap-6 px-5 py-10">
      <div className="flex flex-col gap-2">
        <div className="flex size-14 items-center justify-center rounded-2xl bg-accent text-3xl shadow-md">
          🛒
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-fg">
          Welcome to {store.name}
        </h1>
        <p className="text-sm text-muted">
          Your neighborhood supermarket. How would you like to receive your fresh groceries today?
        </p>
      </div>

      <div className="flex flex-col gap-3">
        <button
          onClick={() => setFulfilment("pickup")}
          className="group flex flex-col gap-1.5 rounded-[16px] border border-border bg-surface p-4 text-left shadow-xs transition-all hover:border-accent hover:shadow-md active:scale-[0.98]"
        >
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-2 text-base font-bold text-fg">
              <span>🏪</span> Store Owner Pickup
            </span>
            <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-xs font-semibold text-emerald-700 dark:text-emerald-400">
              Ready in ~{store.pickupEtaMinutes}m
            </span>
          </div>
          <p className="text-xs text-muted">
            Order ahead and pick up directly from the store owner at {store.name}.
          </p>
        </button>

        <button
          onClick={() => {
            if (deliveryEnabled) setFulfilment("delivery");
          }}
          disabled={!deliveryEnabled}
          className={`group flex flex-col gap-1.5 rounded-[16px] border p-4 text-left shadow-xs transition-all ${
            deliveryEnabled
              ? "border-border bg-surface hover:border-accent hover:shadow-md active:scale-[0.98]"
              : "border-dashed border-neutral-300 bg-neutral-100 opacity-60 cursor-not-allowed dark:border-neutral-800 dark:bg-neutral-900"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-2 text-base font-bold text-fg">
              <span>🛵</span> Store Delivery
            </span>
            {deliveryEnabled ? (
              <span className="rounded-full bg-accent px-2 py-0.5 text-xs font-semibold text-accent-fg">
                ⚡ ~{store.deliveryEtaMinutes} mins
              </span>
            ) : (
              <span className="rounded-full bg-neutral-200 px-2.5 py-0.5 text-[11px] font-bold text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300">
                🚫 Paused (No Drivers)
              </span>
            )}
          </div>
          <p className="text-xs text-muted">
            {deliveryEnabled
              ? "Fresh groceries delivered straight from our store to your doorstep."
              : "Deliveries temporarily stopped by store owner because no delivery partners are available. Please choose Store Owner Pickup."}
          </p>
        </button>
      </div>
    </section>
  );
}

function Home({ fulfilment }: { fulfilment: Fulfilment }) {
  const setFulfilment = usePrefsStore((s) => s.setFulfilment);
  const deliveryEnabled = useStoreSettings((s) => s.deliveryEnabled);
  const fetchSettings = useStoreSettings((s) => s.fetchSettings);
  const [query, setQuery] = useState("");
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [onlyVeg, setOnlyVeg] = useState(false);
  const [sortBy, setSortBy] = useState<"featured" | "price-asc" | "price-desc">("featured");

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  // If user previously selected delivery but owner stopped it, gracefully switch to pickup
  useEffect(() => {
    if (!deliveryEnabled && fulfilment === "delivery") {
      setFulfilment("pickup");
    }
  }, [deliveryEnabled, fulfilment, setFulfilment]);

  const visible = useMemo(() => {
    let list = products.filter((p) => {
      const matchesCategory = categoryId === null || p.categoryId === categoryId;
      const matchesQuery =
        p.name.toLowerCase().includes(query.trim().toLowerCase()) ||
        p.description.toLowerCase().includes(query.trim().toLowerCase());
      const matchesVeg = !onlyVeg || p.isVeg === true;
      return matchesCategory && matchesQuery && matchesVeg;
    });

    if (sortBy === "price-asc") {
      list = [...list].sort((a, b) => a.unitPricePaise - b.unitPricePaise);
    } else if (sortBy === "price-desc") {
      list = [...list].sort((a, b) => b.unitPricePaise - a.unitPricePaise);
    }
    return list;
  }, [categoryId, query, onlyVeg, sortBy]);

  return (
    <div className="flex flex-col gap-4 px-4 pt-3 pb-6">
      {/* Top Location & Mode Switcher */}
      <header className="flex flex-col gap-2.5">
        <LocationPicker />

        <div
          role="group"
          aria-label="Fulfilment mode"
          className="grid grid-cols-2 rounded-[12px] border-[0.5px] border-border bg-surface p-1 shadow-2xs"
        >
          <button
            aria-pressed={fulfilment === "pickup"}
            onClick={() => setFulfilment("pickup")}
            className={`flex min-h-10 items-center justify-center gap-1.5 rounded-[9px] text-xs font-semibold transition-all ${
              fulfilment === "pickup"
                ? "bg-accent text-accent-fg shadow-xs"
                : "text-muted hover:text-fg"
            }`}
          >
            <span>🏪</span>
            <span>Pickup in {store.pickupEtaMinutes}m</span>
          </button>
          <button
            aria-pressed={fulfilment === "delivery"}
            disabled={!deliveryEnabled}
            onClick={() => {
              if (deliveryEnabled) setFulfilment("delivery");
            }}
            className={`flex min-h-10 items-center justify-center gap-1.5 rounded-[9px] text-xs font-semibold transition-all ${
              !deliveryEnabled
                ? "cursor-not-allowed bg-neutral-100 text-neutral-400 opacity-60 dark:bg-neutral-900 dark:text-neutral-500"
                : fulfilment === "delivery"
                ? "bg-accent text-accent-fg shadow-xs"
                : "text-muted hover:text-fg"
            }`}
            title={!deliveryEnabled ? "Deliveries paused by store owner" : undefined}
          >
            <span>⚡</span>
            <span>{deliveryEnabled ? `Delivery in ${store.deliveryEtaMinutes}m` : "Delivery (Paused)"}</span>
          </button>
        </div>

        {!deliveryEnabled && (
          <div className="flex items-center gap-2 rounded-xl border border-amber-300 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-200">
            <span>🛵</span>
            <span>Store deliveries temporarily paused (no drivers available). Pickup orders active!</span>
          </div>
        )}
      </header>

      {/* Promotional Banner */}
      <div className="relative overflow-hidden rounded-[14px] bg-gradient-to-r from-emerald-800 to-teal-700 p-4 text-white shadow-xs">
        <div className="relative z-10 flex flex-col gap-1 max-w-[70%]">
          <span className="inline-block w-fit rounded-full bg-white/20 backdrop-blur-xs px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider">
            Store Deal 🚀
          </span>
          <p className="text-base font-bold leading-tight">
            Midnight Cravings or Morning Chai?
          </p>
          <p className="text-xs text-emerald-100">
            Delivered in 12 mins. Free delivery over ₹199!
          </p>
        </div>
        <div className="absolute right-3 -bottom-2 text-6xl opacity-90 select-none">
          🛍️
        </div>
      </div>

      {/* Search Bar */}
      <div className="relative flex items-center">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 20 20"
          fill="currentColor"
          className="pointer-events-none absolute left-3 size-4 text-muted"
        >
          <path
            fillRule="evenodd"
            d="M9 3.5a5.5 5.5 0 1 0 0 11 5.5 5.5 0 0 0 0-11ZM2 9a7 7 0 1 1 12.452 4.391l3.328 3.329a.75.75 0 1 1-1.06 1.06l-3.329-3.328A7 7 0 0 1 2 9Z"
            clipRule="evenodd"
          />
        </svg>

        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search bananas, milk, noodles, coffee..."
          aria-label="Search groceries"
          className="min-h-11 w-full rounded-[10px] border-[0.5px] border-border bg-surface pl-9 pr-9 text-sm placeholder:text-muted focus:border-accent focus:outline-none"
        />

        {query && (
          <button
            onClick={() => setQuery("")}
            className="absolute right-3 flex size-5 items-center justify-center rounded-full bg-neutral-200 text-xs text-muted hover:text-fg dark:bg-neutral-700"
          >
            ✕
          </button>
        )}
      </div>

      {/* Category Pills */}
      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 py-1.5 no-scrollbar scroll-smooth" role="group" aria-label="Categories">
        <button
          onClick={() => setCategoryId(null)}
          aria-pressed={categoryId === null}
          className={`flex min-h-9 shrink-0 items-center gap-1.5 rounded-full border px-3 text-xs font-semibold transition-all ${
            categoryId === null
              ? "border-accent bg-accent text-accent-fg shadow-2xs"
              : "border-border bg-surface text-fg hover:border-accent/40"
          }`}
        >
          <span>✨</span>
          <span>All Items</span>
        </button>

        {categories.map((c) => {
          const active = categoryId === c.id;
          return (
            <button
              key={c.id}
              onClick={() => setCategoryId(active ? null : c.id)}
              aria-pressed={active}
              className={`flex min-h-9 shrink-0 items-center gap-1.5 rounded-full border px-3 text-xs font-semibold transition-all ${
                active
                  ? "border-accent bg-accent text-accent-fg shadow-2xs"
                  : "border-border bg-surface text-fg hover:border-accent/40"
              }`}
            >
              <span>{c.icon}</span>
              <span>{c.name}</span>
            </button>
          );
        })}
      </div>

      {/* Secondary Filter & Sort toolbar */}
      <div className="flex items-center justify-between text-xs text-muted">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setOnlyVeg((v) => !v)}
            className={`flex items-center gap-1 rounded-md border px-2 py-1 font-medium transition-colors ${
              onlyVeg
                ? "border-emerald-600 bg-emerald-50 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200"
                : "border-border bg-surface hover:text-fg"
            }`}
          >
            <span className="size-2 rounded-full bg-emerald-600" />
            <span>Veg only</span>
          </button>
          <span className="text-muted/60">|</span>
          <span>{visible.length} products</span>
        </div>

        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as "featured" | "price-asc" | "price-desc")}
          className="rounded-md border border-border bg-surface px-2 py-1 text-xs text-fg focus:outline-none"
        >
          <option value="featured">Featured</option>
          <option value="price-asc">Price: Low to High</option>
          <option value="price-desc">Price: High to Low</option>
        </select>
      </div>

      {/* Product Grid */}
      <div className="grid grid-cols-2 gap-3">
        {visible.map((p) => (
          <ProductCard key={p.id} product={p} />
        ))}
      </div>

      {visible.length === 0 && (
        <div className="flex flex-col items-center justify-center gap-2 py-12 text-center">
          <span className="text-4xl">🔍</span>
          <p className="text-sm font-semibold">No products found</p>
          <p className="text-xs text-muted">
            Try searching for something else or clear filters.
          </p>
          <button
            onClick={() => {
              setQuery("");
              setCategoryId(null);
              setOnlyVeg(false);
            }}
            className="mt-2 rounded-[8px] bg-accent/10 px-3 py-1.5 text-xs font-semibold text-accent"
          >
            Reset Filters
          </button>
        </div>
      )}
    </div>
  );
}

function ProductCard({ product }: { product: Product }) {
  const discountPercent = Math.round(
    ((product.mrpPaise - product.unitPricePaise) / product.mrpPaise) * 100,
  );

  return (
    <article className="group flex flex-col justify-between rounded-[14px] border-[0.5px] border-border bg-surface p-2.5 shadow-2xs transition-all hover:border-accent/40 hover:shadow-xs">
      <Link href={`/product/${product.id}`} className="flex flex-col gap-1.5">
        <ProductPlaceholder
          name={product.name}
          image={product.image}
          badge={product.badge}
          isVeg={product.isVeg}
        />
        <div className="flex flex-col gap-0.5 pt-1">
          <p className="text-[11px] font-medium text-muted">{product.unit}</p>
          <h2 className="line-clamp-2 min-h-[2.5rem] text-xs font-semibold leading-snug text-fg group-hover:text-accent">
            {product.name}
          </h2>
        </div>
      </Link>

      <div className="mt-2 flex flex-col gap-2">
        <div className="flex items-baseline justify-between">
          <div className="flex items-baseline gap-1.5">
            <span className="text-sm font-bold text-fg">
              {formatPaise(product.unitPricePaise)}
            </span>
            {product.mrpPaise > product.unitPricePaise && (
              <span className="text-[11px] text-muted line-through">
                {formatPaise(product.mrpPaise)}
              </span>
            )}
          </div>
          {discountPercent > 5 && (
            <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400">
              {discountPercent}% OFF
            </span>
          )}
        </div>

        <QtyControl
          productId={product.id}
          name={product.name}
          unit={product.unit}
          unitPricePaise={product.unitPricePaise}
          image={product.image}
          mrpPaise={product.mrpPaise}
        />
      </div>
    </article>
  );
}
