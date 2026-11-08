"use client";

import { useState } from "react";
import { useHydrated } from "@/lib/hooks/useHydrated";
import { MAX_QTY_PER_ITEM, useCartStore } from "./cartStore";

type Props = {
  productId: string;
  name: string;
  unit: string;
  unitPricePaise: number;
  image?: string;
  mrpPaise?: number;
  size?: "compact" | "large";
};

export function QtyControl({
  productId,
  name,
  unit,
  unitPricePaise,
  image,
  mrpPaise,
  size = "compact",
}: Props) {
  const hydrated = useHydrated();
  const qty = useCartStore((s) => s.items.find((i) => i.productId === productId)?.qty ?? 0);
  const addItem = useCartStore((s) => s.addItem);
  const setQty = useCartStore((s) => s.setQty);
  const [pulse, setPulse] = useState(0);

  const bump = () => setPulse((p) => p + 1);

  const height = size === "large" ? "h-12 text-base font-semibold" : "h-9 text-xs font-semibold";

  if (!hydrated || qty === 0) {
    return (
      <button
        key={`add-${pulse}`}
        disabled={!hydrated}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          bump();
          addItem({ productId, name, unit, unitPricePaise, image, mrpPaise });
        }}
        className={`animate-tap flex w-full items-center justify-center gap-1.5 rounded-[8px] bg-accent font-semibold text-accent-fg shadow-xs transition-all hover:opacity-95 active:scale-95 disabled:opacity-50 ${height}`}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 20 20"
          fill="currentColor"
          className="size-4"
        >
          <path d="M10.75 4.75a.75.75 0 0 0-1.5 0v4.5h-4.5a.75.75 0 0 0 0 1.5h4.5v4.5a.75.75 0 0 0 1.5 0v-4.5h4.5a.75.75 0 0 0 0-1.5h-4.5v-4.5Z" />
        </svg>
        <span>ADD</span>
      </button>
    );
  }

  return (
    <div
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
      }}
      className={`flex w-full items-center justify-between rounded-[8px] bg-accent font-semibold text-accent-fg shadow-xs ${height}`}
    >
      <button
        aria-label={`Decrease ${name}`}
        onClick={() => {
          bump();
          setQty(productId, qty - 1);
        }}
        className="flex h-full w-9 items-center justify-center rounded-l-[8px] transition-transform active:scale-80 hover:bg-black/10"
      >
        {qty === 1 ? (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 20 20"
            fill="currentColor"
            className="size-4"
          >
            <path
              fillRule="evenodd"
              d="M8.75 1A2.75 2.75 0 0 0 6 3.75v.443c-.795.077-1.584.176-2.365.298a.75.75 0 1 0 .23 1.482l.149-.022.841 10.518A2.75 2.75 0 0 0 7.596 19h4.807a2.75 2.75 0 0 0 2.742-2.53l.841-10.52.149.023a.75.75 0 0 0 .23-1.482A41.03 41.03 0 0 0 14 4.193V3.75A2.75 2.75 0 0 0 11.25 1h-2.5ZM10 4c.84 0 1.673.025 2.5.075V3.75c0-.69-.56-1.25-1.25-1.25h-2.5c-.69 0-1.25.56-1.25 1.25v.325C8.327 4.025 9.16 4 10 4ZM8.58 7.72a.75.75 0 0 0-1.5.06l.3 7.5a.75.75 0 1 0 1.5-.06l-.3-7.5Zm4.34.06a.75.75 0 1 0-1.5-.06l-.3 7.5a.75.75 0 1 0 1.5.06l.3-7.5Z"
              clipRule="evenodd"
            />
          </svg>
        ) : (
          <span className="text-base font-bold">−</span>
        )}
      </button>

      <span
        key={`qty-${pulse}`}
        className="animate-tap min-w-[20px] text-center text-sm font-bold"
        aria-live="polite"
      >
        {qty}
      </span>

      <button
        aria-label={`Increase ${name}`}
        disabled={qty >= MAX_QTY_PER_ITEM}
        onClick={() => {
          bump();
          setQty(productId, qty + 1);
        }}
        className="flex h-full w-9 items-center justify-center rounded-r-[8px] transition-transform active:scale-80 hover:bg-black/10 disabled:opacity-40"
      >
        <span className="text-base font-bold">+</span>
      </button>
    </div>
  );
}
