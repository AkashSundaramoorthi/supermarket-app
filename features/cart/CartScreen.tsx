"use client";

import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { useHydrated } from "@/lib/hooks/useHydrated";
import { formatPaise } from "@/lib/format/money";
import { calculateCartTotal } from "@/lib/pricing/calculateCartTotal";
import { store } from "@/lib/placeholder/catalog";
import { placeholderUser } from "@/lib/placeholder/user";
import { usePrefsStore } from "@/features/home/prefsStore";
import { useCartStore } from "./cartStore";

export function CartScreen() {
  const hydrated = useHydrated();
  const items = useCartStore((s) => s.items);
  const setQty = useCartStore((s) => s.setQty);
  const fulfilment = usePrefsStore((s) => s.fulfilment) ?? "pickup";
  const setFulfilment = usePrefsStore((s) => s.setFulfilment);
  if (!hydrated) return null;

  if (items.length === 0) {
    return (
      <div className="flex flex-col gap-3 p-4">
        <h1 className="text-xl font-semibold">Your cart is empty</h1>
        <Link href="/" className="text-accent">Browse groceries</Link>
      </div>
    );
  }

  const total = calculateCartTotal({
    lines: items,
    isStudent: placeholderUser.isStudent,
    fulfilment,
    deliveryFeePaise: store.deliveryFeePaise,
  });

  return (
    <div className="flex flex-col gap-4 p-4">
      <h1 className="text-xl font-semibold">Cart</h1>

      <ul className="flex flex-col gap-3">
        {items.map((item) => (
          <li key={item.productId} className="flex items-center justify-between gap-3 rounded-[12px] border-[0.5px] border-border bg-surface p-3">
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{item.name}</p>
              <p className="text-xs text-muted">{item.unit} · {formatPaise(item.unitPricePaise)}</p>
            </div>
            <div className="flex items-center gap-2">
              <button aria-label={`Decrease ${item.name}`} onClick={() => setQty(item.productId, item.qty - 1)} className="min-h-11 min-w-11 rounded-[8px] border-[0.5px] border-border">-</button>
              <span className="w-6 text-center text-sm" aria-live="polite">{item.qty}</span>
              <button aria-label={`Increase ${item.name}`} onClick={() => setQty(item.productId, item.qty + 1)} className="min-h-11 min-w-11 rounded-[8px] border-[0.5px] border-border">+</button>
            </div>
          </li>
        ))}
      </ul>

      <div role="group" aria-label="Fulfilment" className="grid grid-cols-2 rounded-[8px] border-[0.5px] border-border bg-surface p-1">
        {(["pickup", "delivery"] as const).map((option) => (
          <button
            key={option}
            aria-pressed={fulfilment === option}
            onClick={() => setFulfilment(option)}
            className={`min-h-11 rounded-[8px] text-sm font-medium ${fulfilment === option ? "bg-accent text-accent-fg" : "text-muted"}`}
          >
            {option === "pickup" ? "Pickup" : "Delivery"}
          </button>
        ))}
      </div>

      <dl className="flex flex-col gap-2 rounded-[12px] border-[0.5px] border-border bg-surface p-4 text-sm">
        <Row label="Subtotal" value={formatPaise(total.subtotalPaise)} />
        <Row
          label="Student discount"
          value={placeholderUser.isStudent ? `-${formatPaise(total.discountPaise)}` : "Verify ID for 10% off"}
        />
        <Row label="Delivery fee" value={fulfilment === "delivery" ? formatPaise(total.deliveryFeePaise) : "Free"} />
        <div className="mt-1 flex justify-between border-t-[0.5px] border-border pt-2 font-semibold">
          <dt>Total (preview)</dt>
          <dd>{formatPaise(total.totalPaise)}</dd>
        </div>
      </dl>
      <p className="text-xs text-muted">Prices shown are a preview. The final total is calculated when you pay.</p>

      <Link href="/checkout" className="flex min-h-11 items-center justify-center rounded-[8px] bg-accent text-sm font-medium text-accent-fg">
        Checkout
      </Link>
      <Button variant="secondary" onClick={() => useCartStore.getState().clear()}>Clear cart</Button>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <dt className="text-muted">{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}
