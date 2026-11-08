"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { formatPaise } from "@/lib/format/money";
import { calculateCartTotal } from "@/lib/pricing/calculateCartTotal";
import { products, store } from "@/lib/placeholder/catalog";
import { useCartStore } from "@/features/cart/cartStore";

const IDLE_RESET_MS = 60_000;
const COMPLETE_SCREEN_MS = 20_000;

type Phase = "browse" | "complete";

export function KioskScreen() {
  const [phase, setPhase] = useState<Phase>("browse");
  const [code, setCode] = useState<string | null>(null);
  const items = useCartStore((s) => s.items);
  const addItem = useCartStore((s) => s.addItem);
  const clear = useCartStore((s) => s.clear);

  const reset = useCallback(() => {
    clear();
    setCode(null);
    setPhase("browse");
  }, [clear]);

  useIdleReset(reset, phase === "browse");

  useEffect(() => {
    if (phase !== "complete") return;
    const t = setTimeout(reset, COMPLETE_SCREEN_MS);
    return () => clearTimeout(t);
  }, [phase, reset]);

  const placeOrder = () => {
    setCode(`K-${Math.floor(100 + Math.random() * 900)}`);
    setPhase("complete");
  };

  if (phase === "complete" && code) {
    return (
      <main className="flex min-h-dvh flex-col items-center justify-center gap-6 bg-accent p-8 text-center text-accent-fg">
        <p className="text-2xl">Order placed</p>
        <p className="text-sm">Show this code at {store.name}</p>
        <p className="text-7xl font-bold tracking-widest">{code}</p>
        <p className="text-sm opacity-90">Placeholder code. Real codes arrive with the backend phase.</p>
        <button onClick={reset} className="min-h-14 rounded-[8px] bg-accent-fg px-6 text-lg font-medium text-accent">
          Start new order
        </button>
      </main>
    );
  }

  const total = calculateCartTotal({ lines: items, fulfilment: "pickup", deliveryFeePaise: 0 });
  const count = items.reduce((sum, i) => sum + i.qty, 0);

  return (
    <main className="flex min-h-dvh flex-col bg-bg">
      <header className="flex items-center justify-between gap-3 border-b-[0.5px] border-border bg-surface px-6 py-4">
        <div>
          <p className="text-xs text-muted">Pickup at</p>
          <p className="text-xl font-semibold">{store.name}</p>
        </div>
        <button
          onClick={() => document.documentElement.requestFullscreen?.()}
          className="min-h-14 rounded-[8px] border-[0.5px] border-border px-5 text-base"
        >
          Full screen
        </button>
      </header>

      <div className="grid flex-1 grid-cols-2 content-start gap-4 p-6 pb-44 lg:grid-cols-3">
        {products.map((p) => (
          <button
            key={p.id}
            onClick={() => addItem({ productId: p.id, name: p.name, unit: p.unit, unitPricePaise: p.unitPricePaise })}
            className="flex min-h-40 flex-col items-start justify-between rounded-[12px] border-[0.5px] border-border bg-surface p-5 text-left"
          >
            <span className="text-xl font-medium">{p.name}</span>
            <span className="text-base text-muted">{p.unit}</span>
            <span className="text-lg font-semibold">{formatPaise(p.unitPricePaise)}</span>
          </button>
        ))}
      </div>

      <footer className="fixed bottom-0 left-0 right-0 flex items-center justify-between gap-4 border-t-[0.5px] border-border bg-surface px-6 py-4">
        <div>
          <p className="text-sm text-muted">{count} {count === 1 ? "item" : "items"}</p>
          <p className="text-2xl font-semibold">{formatPaise(total.totalPaise)}</p>
        </div>
        <div className="flex gap-3">
          <button onClick={reset} disabled={count === 0} className="min-h-14 rounded-[8px] border-[0.5px] border-border px-5 disabled:opacity-50">
            Clear
          </button>
          <button onClick={placeOrder} disabled={count === 0} className="min-h-14 rounded-[8px] bg-accent px-6 text-lg font-medium text-accent-fg disabled:opacity-50">
            Place order
          </button>
        </div>
      </footer>
    </main>
  );
}

function useIdleReset(onIdle: () => void, active: boolean) {
  const onIdleRef = useRef(onIdle);
  useEffect(() => {
    onIdleRef.current = onIdle;
  }, [onIdle]);

  useEffect(() => {
    if (!active) return;
    let timer = setTimeout(() => onIdleRef.current(), IDLE_RESET_MS);
    const restart = () => {
      clearTimeout(timer);
      timer = setTimeout(() => onIdleRef.current(), IDLE_RESET_MS);
    };
    const events = ["pointerdown", "keydown", "touchstart"] as const;
    events.forEach((e) => window.addEventListener(e, restart));
    return () => {
      clearTimeout(timer);
      events.forEach((e) => window.removeEventListener(e, restart));
    };
  }, [active]);
}
