"use client";

import Link from "next/link";
import { useState, useMemo, useEffect, useRef } from "react";
import { useHydrated } from "@/lib/hooks/useHydrated";
import { formatPaise } from "@/lib/format/money";
import {
  categories,
  products,
  store,
  topPickProductIds,
  previouslyBoughtProductIds,
  type Product,
} from "@/lib/placeholder/catalog";
import type { Fulfilment } from "@/lib/pricing/calculateCartTotal";
import { ProductPlaceholder } from "@/components/ui/ProductPlaceholder";
import { QtyControl } from "@/features/cart/QtyControl";
import { LocationPicker } from "@/features/location/LocationPicker";
import { usePrefsStore } from "./prefsStore";
import { useStoreSettings } from "@/lib/stores/useStoreSettings";

const SEARCH_SUGGESTIONS = [
  "paneer",
  "ladies' fingers (bhindi)",
  "chips & munchies",
  "chocolates & sweets",
  "farm fresh milk",
  "green beans",
  "instant noodles",
  "fresh bananas",
];

const THEMATIC_SHORTCUTS = [
  { id: "festive", label: "Sweets & Gifting", icon: "🎁", categoryId: "c-sweets" },
  { id: "steal", label: "₹10 Steal Corner", icon: "🪙", query: "10" },
  { id: "veggies", label: "Fresh Farm Veggies", icon: "🥦", categoryId: "c-produce" },
  { id: "dairy", label: "Dairy & Breakfast", icon: "🥛", categoryId: "c-dairy" },
  { id: "munchies", label: "Chai & Munchies", icon: "🥨", categoryId: "c-snacks" },
  { id: "home", label: "Cleaning & Home", icon: "🧼", categoryId: "c-essentials" },
];

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
  const [placeholderIndex, setPlaceholderIndex] = useState(0);
  const productSectionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  // Animated search suggestions ticker (like Blinkit / BigBasket)
  useEffect(() => {
    const timer = setInterval(() => {
      setPlaceholderIndex((prev) => (prev + 1) % SEARCH_SUGGESTIONS.length);
    }, 2800);
    return () => clearInterval(timer);
  }, []);

  // Gracefully fall back to pickup if deliveries were paused by store owner
  useEffect(() => {
    if (!deliveryEnabled && fulfilment === "delivery") {
      setFulfilment("pickup");
    }
  }, [deliveryEnabled, fulfilment, setFulfilment]);

  // Filtered catalogue list
  const visible = useMemo(() => {
    let list = products.filter((p) => {
      const matchesCategory = categoryId === null || p.categoryId === categoryId;
      const q = query.trim().toLowerCase();
      const matchesQuery =
        !q ||
        p.name.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q) ||
        (p.badge && p.badge.toLowerCase().includes(q)) ||
        (q === "10" && (p.unitPricePaise <= 1000 || p.name.includes("10") || p.badge?.includes("10")));
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

  // Top picks items
  const topPicks = useMemo(() => {
    return topPickProductIds
      .map((id) => products.find((p) => p.id === id))
      .filter((p): p is Product => p !== undefined);
  }, []);

  // Previously bought items
  const previouslyBought = useMemo(() => {
    return previouslyBoughtProductIds
      .map((id) => products.find((p) => p.id === id))
      .filter((p): p is Product => p !== undefined);
  }, []);

  const scrollToCatalog = () => {
    productSectionRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const handleShortcutClick = (shortcut: (typeof THEMATIC_SHORTCUTS)[0]) => {
    if (shortcut.categoryId) {
      setCategoryId(shortcut.categoryId);
      setQuery("");
    } else if (shortcut.query) {
      setQuery(shortcut.query);
      setCategoryId(null);
    }
    scrollToCatalog();
  };

  const isBrowsingAll = !query && categoryId === null;

  return (
    <div className="flex flex-col gap-4 px-3.5 pt-2 pb-6">
      {/* 1. Blinkit / BigBasket Top Surge / Free Delivery Banner */}
      <div className="flex items-center justify-between rounded-lg bg-emerald-900/10 px-3 py-1.5 text-[11px] font-semibold text-emerald-950 dark:bg-emerald-950/40 dark:text-emerald-300">
        <div className="flex items-center gap-1.5 truncate">
          <span className="flex size-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="truncate">Free delivery on orders above ₹199</span>
        </div>
        <span className="shrink-0 text-[10px] font-bold text-emerald-700 dark:text-emerald-400">
          Open 7 AM – 11:30 PM
        </span>
      </div>

      {/* 2. Brand ETA, Location Picker & Fulfilment Switcher */}
      <header className="flex flex-col gap-2.5">
        <div className="flex items-center justify-between gap-2">
          {/* Prominent ETA pill */}
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 rounded-full bg-emerald-800 px-3 py-1 text-white shadow-xs dark:bg-emerald-700">
              <span className="text-sm">⚡</span>
              <span className="text-xs font-black tracking-tight">
                {fulfilment === "delivery"
                  ? `${store.deliveryEtaMinutes} MINS`
                  : `${store.pickupEtaMinutes} MINS`}
              </span>
            </div>
            <span className="text-xs font-bold text-muted hidden sm:inline">
              to your location
            </span>
          </div>

          {/* Pickup / Delivery Toggle */}
          <div
            role="group"
            aria-label="Fulfilment mode"
            className="flex items-center rounded-full border border-border bg-surface p-0.5 shadow-2xs"
          >
            <button
              aria-pressed={fulfilment === "delivery"}
              disabled={!deliveryEnabled}
              onClick={() => {
                if (deliveryEnabled) setFulfilment("delivery");
              }}
              className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold transition-all ${
                !deliveryEnabled
                  ? "cursor-not-allowed opacity-50 text-neutral-400"
                  : fulfilment === "delivery"
                  ? "bg-accent text-accent-fg shadow-xs"
                  : "text-muted hover:text-fg"
              }`}
            >
              <span>🛵 Delivery</span>
            </button>
            <button
              aria-pressed={fulfilment === "pickup"}
              onClick={() => setFulfilment("pickup")}
              className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold transition-all ${
                fulfilment === "pickup"
                  ? "bg-accent text-accent-fg shadow-xs"
                  : "text-muted hover:text-fg"
              }`}
            >
              <span>🏪 Pickup</span>
            </button>
          </div>
        </div>

        {/* Location Selector Bar */}
        <LocationPicker />

        {!deliveryEnabled && (
          <div className="flex items-center gap-2 rounded-xl border border-amber-300 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-200">
            <span>🛵</span>
            <span>Store deliveries temporarily paused (no drivers available). Pickup orders active!</span>
          </div>
        )}
      </header>

      {/* 3. Blinkit / BigBasket Smart Search Bar */}
      <div className="relative flex items-center">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 20 20"
          fill="currentColor"
          className="pointer-events-none absolute left-3.5 size-4 text-muted"
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
          placeholder={`Search "${SEARCH_SUGGESTIONS[placeholderIndex]}"`}
          aria-label="Search groceries"
          className="min-h-12 w-full rounded-[14px] border border-border bg-surface pl-10 pr-16 text-sm placeholder:text-muted/70 focus:border-accent focus:outline-none shadow-xs transition-all"
        />

        <div className="absolute right-3 flex items-center gap-1.5 text-muted">
          {query ? (
            <button
              onClick={() => setQuery("")}
              className="flex size-6 items-center justify-center rounded-full bg-neutral-200 text-xs text-neutral-700 hover:text-black dark:bg-neutral-700 dark:text-neutral-200"
            >
              ✕
            </button>
          ) : (
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="size-4 opacity-60"
            >
              <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
              <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
              <line x1="12" x2="12" y1="19" y2="22" />
            </svg>
          )}
        </div>
      </div>

      {/* 4. Quick Category Navigation Tabs (Horizontal Scroll with Icons) */}
      <div
        className="-mx-3.5 flex gap-2 overflow-x-auto px-3.5 py-1 no-scrollbar scroll-smooth"
        role="group"
        aria-label="Categories"
      >
        <button
          onClick={() => {
            setCategoryId(null);
            setQuery("");
          }}
          aria-pressed={categoryId === null}
          className={`flex min-h-9 shrink-0 items-center gap-1.5 rounded-full border px-3 text-xs font-semibold transition-all ${
            categoryId === null
              ? "border-accent bg-accent text-accent-fg shadow-2xs"
              : "border-border bg-surface text-fg hover:border-accent/40"
          }`}
        >
          <span>🧺</span>
          <span>All Items</span>
        </button>

        {categories.map((c) => {
          const active = categoryId === c.id;
          return (
            <button
              key={c.id}
              onClick={() => {
                setCategoryId(active ? null : c.id);
                setQuery("");
              }}
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

      {/* Only show rich curated shelves when user isn't searching a specific query */}
      {isBrowsingAll && (
        <>
          {/* 5. Big Festive & Deals Hero Card (Inspired by Zepto & BigBasket) */}
          <div className="relative overflow-hidden rounded-[18px] bg-gradient-to-br from-emerald-900 via-teal-900 to-emerald-950 p-4 text-white shadow-md">
            <div className="relative z-10 flex flex-col gap-1.5">
              <div className="flex items-center gap-2">
                <span className="rounded-full bg-amber-400 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-neutral-950">
                  MEGA SAVINGS 🔥
                </span>
                <span className="text-[11px] font-bold text-amber-200">
                  Buy 1 Get 1 Free & ₹10 Corner
                </span>
              </div>
              <h2 className="text-lg font-black tracking-tight leading-snug">
                Daily Fresh Deals & Festive Corner
              </h2>
              <p className="text-xs text-emerald-100/90 max-w-[85%]">
                Handpicked farm veggies, dairy, sweet boxes, and party snacks delivered in minutes.
              </p>

              {/* 3x2 Thematic Visual Shortcut Grid */}
              <div className="mt-2.5 grid grid-cols-3 gap-2">
                {THEMATIC_SHORTCUTS.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => handleShortcutClick(item)}
                    className="flex flex-col items-center justify-center gap-1 rounded-xl bg-white/10 p-2 text-center backdrop-blur-xs transition-all hover:bg-white/20 active:scale-95"
                  >
                    <span className="text-xl">{item.icon}</span>
                    <span className="line-clamp-1 text-[10px] font-bold text-white">
                      {item.label}
                    </span>
                  </button>
                ))}
              </div>

              {/* Instant Bank / UPI Offer Strip */}
              <div className="mt-2 flex items-center justify-between rounded-lg bg-black/25 px-2.5 py-1.5 text-[10px] font-medium text-emerald-200">
                <div className="flex items-center gap-1.5">
                  <span>⚡</span>
                  <span>Direct UPI: Flat ₹50 OFF on ₹299+</span>
                </div>
                <span className="font-bold text-amber-300">Auto-Applied</span>
              </div>
            </div>
          </div>

          {/* 6. Blinkit Inspired "Previously Bought" / Quick Re-order Shelf */}
          {previouslyBought.length > 0 && (
            <section className="flex flex-col gap-2.5 pt-1">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <span className="text-sm">🔄</span>
                  <h3 className="text-sm font-bold text-fg">Previously bought</h3>
                </div>
                <span className="text-[11px] font-semibold text-accent">
                  Repeat favorites
                </span>
              </div>

              <div className="-mx-3.5 flex gap-2.5 overflow-x-auto px-3.5 pb-1 no-scrollbar scroll-smooth">
                {previouslyBought.map((p) => (
                  <PreviouslyBoughtCard key={p.id} product={p} />
                ))}
              </div>
            </section>
          )}

          {/* 7. BigBasket Inspired "Top Picks" Shelf */}
          {topPicks.length > 0 && (
            <section className="flex flex-col gap-2.5 pt-1">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <span className="text-sm">⭐</span>
                  <h3 className="text-sm font-bold text-fg">Top picks</h3>
                </div>
                <button
                  onClick={scrollToCatalog}
                  className="flex items-center gap-0.5 text-xs font-bold text-accent hover:underline"
                >
                  <span>See all</span>
                  <span>›</span>
                </button>
              </div>

              <div className="-mx-3.5 flex gap-3 overflow-x-auto px-3.5 pb-2 no-scrollbar scroll-smooth">
                {topPicks.map((p) => (
                  <TopPickCard key={p.id} product={p} />
                ))}
              </div>
            </section>
          )}

          {/* 8. BigBasket Inspired 4-Column "Explore Categories" Visual Grid */}
          <section className="flex flex-col gap-2.5 pt-1">
            <h3 className="text-sm font-bold text-fg">Explore by Category</h3>
            <div className="grid grid-cols-4 gap-2">
              {categories.map((c) => (
                <button
                  key={c.id}
                  onClick={() => {
                    setCategoryId(c.id);
                    scrollToCatalog();
                  }}
                  className="flex flex-col items-center gap-1.5 rounded-[14px] border border-border/60 bg-surface p-2.5 text-center shadow-2xs transition-all hover:border-accent hover:shadow-xs active:scale-95"
                >
                  <div className="flex size-10 items-center justify-center rounded-xl bg-neutral-100 text-2xl dark:bg-neutral-800">
                    {c.icon}
                  </div>
                  <span className="line-clamp-2 text-[11px] font-semibold text-fg leading-tight">
                    {c.name}
                  </span>
                </button>
              ))}
            </div>
          </section>
        </>
      )}

      {/* 9. Product Catalog Section */}
      <div ref={productSectionRef} className="flex flex-col gap-3 pt-2">
        {/* Secondary Filter & Sort toolbar */}
        <div className="flex items-center justify-between text-xs text-muted">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setOnlyVeg((v) => !v)}
              className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold transition-colors ${
                onlyVeg
                  ? "border-emerald-600 bg-emerald-50 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200"
                  : "border-border bg-surface hover:text-fg"
              }`}
            >
              <span className="size-2 rounded-full bg-emerald-600" />
              <span>Veg only</span>
            </button>
            <span className="text-muted/60">|</span>
            <span className="font-medium">{visible.length} products</span>
          </div>

          <div className="flex items-center gap-1.5">
            {categoryId && (
              <button
                onClick={() => setCategoryId(null)}
                className="text-[11px] font-bold text-accent hover:underline"
              >
                Clear Filter ✕
              </button>
            )}
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
        </div>

        {/* 2-Column Product Grid */}
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
    </div>
  );
}

{/* BigBasket-style Top Pick Card */}
function TopPickCard({ product }: { product: Product }) {
  const discountPercent = Math.round(
    ((product.mrpPaise - product.unitPricePaise) / product.mrpPaise) * 100,
  );

  return (
    <article className="group flex w-[150px] shrink-0 flex-col justify-between rounded-[14px] border border-border/80 bg-surface p-2 shadow-2xs transition-all hover:border-accent/40 hover:shadow-xs">
      <Link href={`/product/${product.id}`} className="flex flex-col gap-1.5">
        <div className="relative">
          <ProductPlaceholder
            name={product.name}
            image={product.image}
            isVeg={product.isVeg}
            className="rounded-[10px]"
          />
          {discountPercent > 5 && (
            <span className="absolute -top-1.5 left-1 rounded-sm bg-amber-400 px-1.5 py-0.5 text-[9px] font-black uppercase text-neutral-950 shadow-xs">
              {discountPercent}% OFF
            </span>
          )}
        </div>

        {/* Pack Size Dropdown Pill (BigBasket style) */}
        <div className="flex items-center justify-between rounded-md bg-neutral-100 px-1.5 py-0.5 text-[10px] font-medium text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300">
          <span className="truncate">{product.unit}</span>
          <span className="text-[9px] opacity-70">▾</span>
        </div>

        <h4 className="line-clamp-2 min-h-[2rem] text-[11px] font-bold leading-tight text-fg group-hover:text-accent">
          {product.name}
        </h4>
      </Link>

      <div className="mt-2 flex flex-col gap-1.5">
        <div className="flex items-baseline gap-1">
          <span className="text-xs font-black text-fg">
            {formatPaise(product.unitPricePaise)}
          </span>
          {product.mrpPaise > product.unitPricePaise && (
            <span className="text-[10px] text-muted line-through">
              {formatPaise(product.mrpPaise)}
            </span>
          )}
        </div>

        <div className="flex items-center justify-between text-[10px] text-muted">
          <span>⚡ ~12m</span>
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

{/* Blinkit-style Previously Bought Card */}
function PreviouslyBoughtCard({ product }: { product: Product }) {
  return (
    <article className="group flex w-[140px] shrink-0 flex-col justify-between rounded-[14px] border border-border/80 bg-surface p-2 shadow-2xs transition-all hover:border-accent/40 hover:shadow-xs">
      <Link href={`/product/${product.id}`} className="flex flex-col gap-1.5">
        <ProductPlaceholder
          name={product.name}
          image={product.image}
          isVeg={product.isVeg}
          className="rounded-[10px]"
        />
        <div className="flex flex-col gap-0.5">
          <span className="text-[10px] font-medium text-muted">{product.unit}</span>
          <h4 className="line-clamp-2 min-h-[1.8rem] text-[11px] font-semibold leading-tight text-fg group-hover:text-accent">
            {product.name}
          </h4>
        </div>
      </Link>

      <div className="mt-1.5 flex flex-col gap-1.5">
        <div className="flex items-baseline gap-1">
          <span className="text-xs font-black text-fg">
            {formatPaise(product.unitPricePaise)}
          </span>
          {product.mrpPaise > product.unitPricePaise && (
            <span className="text-[10px] text-muted line-through">
              {formatPaise(product.mrpPaise)}
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

{/* Standard Grid Product Card */}
function ProductCard({ product }: { product: Product }) {
  const discountPercent = Math.round(
    ((product.mrpPaise - product.unitPricePaise) / product.mrpPaise) * 100,
  );

  return (
    <article className="group flex flex-col justify-between rounded-[16px] border border-border/80 bg-surface p-2.5 shadow-2xs transition-all hover:border-accent/40 hover:shadow-xs">
      <Link href={`/product/${product.id}`} className="flex flex-col gap-1.5">
        <div className="relative">
          <ProductPlaceholder
            name={product.name}
            image={product.image}
            badge={product.badge}
            isVeg={product.isVeg}
          />
        </div>
        <div className="flex flex-col gap-0.5 pt-1">
          <div className="flex items-center justify-between text-[10px] font-medium text-muted">
            <span>{product.unit}</span>
            <span>⚡ ~12m</span>
          </div>
          <h2 className="line-clamp-2 min-h-[2.4rem] text-xs font-bold leading-snug text-fg group-hover:text-accent">
            {product.name}
          </h2>
        </div>
      </Link>

      <div className="mt-2 flex flex-col gap-2">
        <div className="flex items-baseline justify-between">
          <div className="flex items-baseline gap-1.5">
            <span className="text-sm font-black text-fg">
              {formatPaise(product.unitPricePaise)}
            </span>
            {product.mrpPaise > product.unitPricePaise && (
              <span className="text-[11px] text-muted line-through">
                {formatPaise(product.mrpPaise)}
              </span>
            )}
          </div>
          {discountPercent > 5 && (
            <span className="rounded-sm bg-amber-400 px-1.5 py-0.2 text-[9px] font-black uppercase text-neutral-950">
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
