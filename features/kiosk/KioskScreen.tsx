"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { formatPaise } from "@/lib/format/money";
import { calculateCartTotal } from "@/lib/pricing/calculateCartTotal";
import { categories, products, store } from "@/lib/placeholder/catalog";
import { ProductPlaceholder } from "@/components/ui/ProductPlaceholder";
import { useCartStore } from "@/features/cart/cartStore";

const IDLE_RESET_MS = 60_000;
const COMPLETE_SCREEN_MS = 25_000;

type Phase = "browse" | "complete";

function useIdleReset(onReset: () => void, active: boolean) {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const ping = useCallback(() => {
    if (!active) return;
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(onReset, IDLE_RESET_MS);
  }, [active, onReset]);

  useEffect(() => {
    if (!active) return;
    const events = ["touchstart", "pointerdown", "keydown"];
    const handler = () => ping();
    events.forEach((e) => window.addEventListener(e, handler, { passive: true }));
    ping();
    return () => {
      events.forEach((e) => window.removeEventListener(e, handler));
      if (timer.current) clearTimeout(timer.current);
    };
  }, [active, ping]);
}

export function KioskScreen() {
  const [phase, setPhase] = useState<Phase>("browse");
  const [code, setCode] = useState<string | null>(null);
  const [categoryId, setCategoryId] = useState<string | null>(null);

  const items = useCartStore((s) => s.items);
  const addItem = useCartStore((s) => s.addItem);
  const setQty = useCartStore((s) => s.setQty);
  const clear = useCartStore((s) => s.clear);

  const reset = useCallback(() => {
    clear();
    setCode(null);
    setPhase("browse");
    setCategoryId(null);
  }, [clear]);

  useIdleReset(reset, phase === "browse");

  useEffect(() => {
    if (phase !== "complete") return;
    const t = setTimeout(reset, COMPLETE_SCREEN_MS);
    return () => clearTimeout(t);
  }, [phase, reset]);

  const placeOrder = async () => {
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: items.map((i) => ({ productId: i.productId, qty: i.qty })),
          fulfilment: "pickup",
          paymentMethod: "upi",
          phone: "9999999999", // Kiosk generic user
        }),
      });

      const data = await res.json();
      setCode(data.collectionCode || `K-${Math.floor(100 + Math.random() * 900)}`);
      setPhase("complete");
    } catch {
      // Fallback
      setCode(`K-${Math.floor(100 + Math.random() * 900)}`);
      setPhase("complete");
    }
  };

  if (phase === "complete" && code) {
    return (
      <main className="flex min-h-dvh flex-col items-center justify-center gap-6 bg-gradient-to-br from-emerald-900 to-teal-950 p-8 text-center text-white">
        <div className="flex size-20 items-center justify-center rounded-full bg-white/10 text-4xl shadow-md">
          ✓
        </div>
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">Order Placed Successfully!</h1>
          <p className="mt-1 text-base text-emerald-200">
            The store owner will hand over your packed groceries directly.
          </p>
        </div>

        <div className="flex flex-col items-center rounded-3xl bg-white/10 backdrop-blur-md px-12 py-8 shadow-2xl border border-white/20">
          <p className="text-xs uppercase tracking-widest text-emerald-300 font-bold">
            Order Verification Code
          </p>
          <p className="text-7xl font-black tracking-widest text-white my-2">{code}</p>
          <div className="my-2 flex h-8 items-center gap-1.5 opacity-80">
            {[...Array(30)].map((_, i) => (
              <span
                key={i}
                className="inline-block h-full bg-white"
                style={{ width: i % 3 === 0 ? "4px" : "2px" }}
              />
            ))}
          </div>
          <p className="text-xs text-emerald-200">{store.name} · Direct Store Owner Handover</p>
        </div>

        <button
          onClick={reset}
          className="min-h-14 rounded-2xl bg-white px-8 text-lg font-bold text-emerald-950 shadow-xl transition-transform active:scale-95 hover:bg-neutral-100"
        >
          Start New Order
        </button>
      </main>
    );
  }

  const total = calculateCartTotal({ lines: items, fulfilment: "pickup", deliveryFeePaise: 0 });
  const count = items.reduce((sum, i) => sum + i.qty, 0);

  const filtered = categoryId
    ? products.filter((p) => p.categoryId === categoryId)
    : products;

  return (
    <main className="flex min-h-dvh flex-col bg-bg text-fg">
      {/* Top Kiosk Header */}
      <header className="flex items-center justify-between border-b border-border bg-surface px-6 py-4 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-xl bg-accent text-xl text-accent-fg font-black">
            🛒
          </div>
          <div>
            <h1 className="text-lg font-bold">{store.name} Quick Order</h1>
            <p className="text-xs text-muted">Tap items to add · Handed over directly by store owner</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              if (!document.fullscreenElement) {
                document.documentElement.requestFullscreen?.();
              } else {
                document.exitFullscreen?.();
              }
            }}
            className="rounded-[10px] border border-border bg-bg px-4 py-2 text-xs font-semibold text-muted hover:text-fg"
          >
            ⛶ Fullscreen
          </button>
        </div>
      </header>

      {/* Category Tabs */}
      <div className="flex gap-2 border-b border-border bg-surface px-6 py-3 overflow-x-auto no-scrollbar">
        <button
          onClick={() => setCategoryId(null)}
          className={`flex shrink-0 items-center gap-1.5 rounded-full border px-4 py-2 text-xs font-bold transition-all ${
            categoryId === null
              ? "border-accent bg-accent text-accent-fg shadow-2xs"
              : "border-border bg-bg text-muted hover:text-fg"
          }`}
        >
          <span>✨</span>
          <span>All Items</span>
        </button>
        {categories.map((c) => (
          <button
            key={c.id}
            onClick={() => setCategoryId(c.id)}
            className={`flex shrink-0 items-center gap-1.5 rounded-full border px-4 py-2 text-xs font-bold transition-all ${
              categoryId === c.id
                ? "border-accent bg-accent text-accent-fg shadow-2xs"
                : "border-border bg-bg text-muted hover:text-fg"
            }`}
          >
            <span>{c.icon}</span>
            <span>{c.name}</span>
          </button>
        ))}
      </div>

      {/* Main Catalog Grid */}
      <div className="grid flex-1 grid-cols-2 content-start gap-4 p-6 pb-40 md:grid-cols-3 lg:grid-cols-4">
        {filtered.map((p) => {
          const inCart = items.find((i) => i.productId === p.id);
          return (
            <div
              key={p.id}
              className={`flex flex-col justify-between rounded-[16px] border bg-surface p-3 shadow-2xs transition-all ${
                inCart ? "border-accent ring-2 ring-accent/20" : "border-border"
              }`}
            >
              <div className="flex flex-col gap-2">
                <ProductPlaceholder
                  name={p.name}
                  image={p.image}
                  badge={p.badge}
                  isVeg={p.isVeg}
                  aspect="square"
                />
                <div>
                  <p className="text-xs text-muted">{p.unit}</p>
                  <h2 className="line-clamp-2 text-sm font-bold text-fg">{p.name}</h2>
                </div>
              </div>

              <div className="mt-3 flex items-center justify-between border-t border-border pt-2.5">
                <span className="text-sm font-extrabold text-fg">
                  {formatPaise(p.unitPricePaise)}
                </span>

                {inCart ? (
                  <div className="flex items-center gap-1 rounded-[8px] bg-accent text-accent-fg px-1.5 py-1">
                    <button
                      onClick={() => setQty(p.id, inCart.qty - 1)}
                      className="size-6 text-sm font-bold hover:bg-black/10 rounded-sm"
                    >
                      −
                    </button>
                    <span className="w-5 text-center text-xs font-bold">{inCart.qty}</span>
                    <button
                      onClick={() => setQty(p.id, inCart.qty + 1)}
                      className="size-6 text-sm font-bold hover:bg-black/10 rounded-sm"
                    >
                      +
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() =>
                      addItem({
                        productId: p.id,
                        name: p.name,
                        unit: p.unit,
                        unitPricePaise: p.unitPricePaise,
                        image: p.image,
                      })
                    }
                    className="rounded-[8px] bg-accent px-3 py-1.5 text-xs font-bold text-accent-fg shadow-2xs active:scale-95"
                  >
                    + ADD
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Bottom Kiosk Fixed Footer */}
      <footer className="fixed bottom-0 left-0 right-0 flex items-center justify-between border-t border-border bg-surface/95 px-6 py-4 backdrop-blur-md shadow-2xl">
        <div className="flex items-center gap-4">
          <div className="flex flex-col">
            <span className="text-xs font-medium text-muted">
              {count} {count === 1 ? "item" : "items"} selected
            </span>
            <span className="text-2xl font-black text-fg">{formatPaise(total.totalPaise)}</span>
          </div>
          {count > 0 && (
            <button
              onClick={reset}
              className="rounded-[10px] border border-border px-3 py-2 text-xs font-semibold text-danger hover:bg-red-500/10"
            >
              Clear Tray
            </button>
          )}
        </div>

        <button
          onClick={placeOrder}
          disabled={count === 0}
          className="flex min-h-13 items-center gap-2 rounded-[12px] bg-accent px-8 text-base font-bold text-accent-fg shadow-lg shadow-accent/25 transition-transform active:scale-95 disabled:opacity-40"
        >
          <span>Confirm & Collect Code</span>
          <span>→</span>
        </button>
      </footer>
    </main>
  );
}
