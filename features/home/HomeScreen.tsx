"use client";

import Link from "next/link";
import { useState } from "react";
import { useHydrated } from "@/lib/hooks/useHydrated";
import { formatPaise } from "@/lib/format/money";
import { categories, products, store, type Product } from "@/lib/placeholder/catalog";
import type { Fulfilment } from "@/lib/pricing/calculateCartTotal";
import { ProductPlaceholder } from "@/components/ui/ProductPlaceholder";
import { QtyControl } from "@/features/cart/QtyControl";
import { LocationPicker } from "@/features/location/LocationPicker";
import { usePrefsStore } from "./prefsStore";

export function HomeScreen() {
  const hydrated = useHydrated();
  const fulfilment = usePrefsStore((s) => s.fulfilment);
  if (!hydrated) return null;
  if (!fulfilment) return <Onboarding />;
  return <Home fulfilment={fulfilment} />;
}

function Onboarding() {
  const setFulfilment = usePrefsStore((s) => s.setFulfilment);
  return (
    <section className="flex min-h-dvh flex-col justify-center gap-6 px-4 py-10">
      <div>
        <h1 className="text-2xl font-semibold">How do you want your groceries?</h1>
        <p className="mt-2 text-sm text-muted">You can change this any time from home.</p>
      </div>
      <button
        onClick={() => setFulfilment("pickup")}
        className="flex min-h-14 flex-col items-start rounded-[12px] border-[0.5px] border-border bg-surface p-4 text-left"
      >
        <span className="font-semibold">Pickup</span>
        <span className="text-sm text-muted">Collect at {store.name} in about {store.pickupEtaMinutes} min</span>
      </button>
      <button
        onClick={() => setFulfilment("delivery")}
        className="flex min-h-14 flex-col items-start rounded-[12px] border-[0.5px] border-border bg-surface p-4 text-left"
      >
        <span className="font-semibold">Delivery</span>
        <span className="text-sm text-muted">Delivery fee {formatPaise(store.deliveryFeePaise)} per order</span>
      </button>
    </section>
  );
}

function Home({ fulfilment }: { fulfilment: Fulfilment }) {
  const setFulfilment = usePrefsStore((s) => s.setFulfilment);
  const [query, setQuery] = useState("");
  const [categoryId, setCategoryId] = useState<string | null>(null);

  const visible = products.filter(
    (p) =>
      (categoryId === null || p.categoryId === categoryId) &&
      p.name.toLowerCase().includes(query.trim().toLowerCase()),
  );

  return (
    <div className="flex flex-col gap-4 px-4 pt-4">
      <header className="flex flex-col gap-3">
        <LocationPicker />
        <div role="group" aria-label="Fulfilment" className="grid grid-cols-2 rounded-[8px] border-[0.5px] border-border bg-surface p-1">
          {(["pickup", "delivery"] as const).map((option) => (
            <button
              key={option}
              aria-pressed={fulfilment === option}
              onClick={() => setFulfilment(option)}
              className={`min-h-11 rounded-[8px] text-sm font-medium ${fulfilment === option ? "bg-accent text-accent-fg" : "text-muted"}`}
            >
              {option === "pickup" ? `Pickup in ${store.pickupEtaMinutes} min` : "Delivery"}
            </button>
          ))}
        </div>
      </header>

      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search groceries"
        aria-label="Search groceries"
        className="min-h-11 rounded-[8px] border-[0.5px] border-border bg-surface px-3 text-sm placeholder:text-muted"
      />

      <div className="-mx-4 flex gap-2 overflow-x-auto px-4" role="group" aria-label="Categories">
        <Chip active={categoryId === null} onClick={() => setCategoryId(null)}>All</Chip>
        {categories.map((c) => (
          <Chip key={c.id} active={categoryId === c.id} onClick={() => setCategoryId(c.id)}>
            {c.name}
          </Chip>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-3">
        {visible.map((p) => (
          <ProductCard key={p.id} product={p} />
        ))}
      </div>
      {visible.length === 0 && <p className="text-sm text-muted">No products match your search.</p>}
    </div>
  );
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      aria-pressed={active}
      className={`min-h-11 shrink-0 rounded-[8px] border-[0.5px] px-4 text-sm ${active ? "border-accent bg-accent text-accent-fg" : "border-border bg-surface text-fg"}`}
    >
      {children}
    </button>
  );
}

function ProductCard({ product }: { product: Product }) {
  return (
    <article className="flex flex-col gap-2 rounded-[12px] border-[0.5px] border-border bg-surface p-3">
      <Link href={`/product/${product.id}`} className="flex flex-col gap-1">
        <ProductPlaceholder name={product.name} />
        <h2 className="mt-1 text-sm font-medium">{product.name}</h2>
        <p className="text-xs text-muted">{product.unit}</p>
        <p className="text-sm font-semibold">{formatPaise(product.unitPricePaise)}</p>
      </Link>
      <QtyControl
        productId={product.id}
        name={product.name}
        unit={product.unit}
        unitPricePaise={product.unitPricePaise}
      />
    </article>
  );
}
