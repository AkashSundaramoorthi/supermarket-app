"use client";

import { useState } from "react";
import { useHydrated } from "@/lib/hooks/useHydrated";
import { MAX_QTY_PER_ITEM, useCartStore } from "./cartStore";

type Props = {
  productId: string;
  name: string;
  unit: string;
  unitPricePaise: number;
  size?: "compact" | "large";
};

export function QtyControl({ productId, name, unit, unitPricePaise, size = "compact" }: Props) {
  const hydrated = useHydrated();
  const qty = useCartStore((s) => s.items.find((i) => i.productId === productId)?.qty ?? 0);
  const addItem = useCartStore((s) => s.addItem);
  const setQty = useCartStore((s) => s.setQty);
  const [pulse, setPulse] = useState(0);
  const height = size === "large" ? "min-h-14 text-lg" : "min-h-11 text-sm";

  const bump = () => setPulse((p) => p + 1);

  if (!hydrated || qty === 0) {
    return (
      <button
        key={`add-${pulse}`}
        disabled={!hydrated}
        onClick={() => {
          bump();
          addItem({ productId, name, unit, unitPricePaise });
        }}
        className={`animate-tap flex w-full items-center justify-center rounded-[8px] bg-accent font-medium text-accent-fg transition-transform active:scale-95 disabled:opacity-50 ${height}`}
      >
        Add
      </button>
    );
  }

  return (
    <div className={`flex w-full items-center justify-between rounded-[8px] bg-accent text-accent-fg ${height}`}>
      <button
        aria-label={`Remove one ${name}`}
        onClick={() => {
          bump();
          setQty(productId, qty - 1);
        }}
        className="min-h-11 min-w-11 rounded-[8px] px-3 font-semibold transition-transform active:scale-90"
      >
        -
      </button>
      <span key={`qty-${pulse}`} className="animate-tap font-semibold" aria-live="polite">
        {qty}
      </span>
      <button
        aria-label={`Add one more ${name}`}
        disabled={qty >= MAX_QTY_PER_ITEM}
        onClick={() => {
          bump();
          setQty(productId, qty + 1);
        }}
        className="min-h-11 min-w-11 rounded-[8px] px-3 font-semibold transition-transform active:scale-90 disabled:opacity-50"
      >
        +
      </button>
    </div>
  );
}
