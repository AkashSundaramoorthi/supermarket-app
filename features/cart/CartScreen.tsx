"use client";

import Link from "next/link";
import { useState } from "react";
import { useHydrated } from "@/lib/hooks/useHydrated";
import { formatPaise } from "@/lib/format/money";
import { calculateCartTotal } from "@/lib/pricing/calculateCartTotal";
import { store } from "@/lib/placeholder/catalog";
import { usePrefsStore } from "@/features/home/prefsStore";
import { ProductPlaceholder } from "@/components/ui/ProductPlaceholder";
import { useCartStore } from "./cartStore";

const INSTRUCTION_TAGS = [
  "Leave at hostel reception 🏢",
  "Call upon arrival 📞",
  "Do not ring bell 🔕",
  "Avoid plastic bags 🌿",
];

export function CartScreen() {
  const hydrated = useHydrated();
  const items = useCartStore((s) => s.items);
  const setQty = useCartStore((s) => s.setQty);
  const clear = useCartStore((s) => s.clear);
  const fulfilment = usePrefsStore((s) => s.fulfilment) ?? "pickup";
  const setFulfilment = usePrefsStore((s) => s.setFulfilment);

  const [couponCode, setCouponCode] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<string | null>(null);
  const [couponError, setCouponError] = useState<string | null>(null);
  const [selectedInstruction, setSelectedInstruction] = useState<string | null>(null);

  if (!hydrated) return null;

  if (items.length === 0) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 p-6 text-center">
        <div className="flex size-20 items-center justify-center rounded-full bg-accent/10 text-4xl">
          🛒
        </div>
        <h1 className="text-xl font-bold">Your cart is empty</h1>
        <p className="max-w-xs text-xs text-muted">
          Your cart feels lonely. Add fresh fruits, veggies, snacks, and daily essentials from FreshMart!
        </p>
        <Link
          href="/"
          className="mt-2 flex min-h-11 items-center justify-center rounded-[10px] bg-accent px-6 text-sm font-semibold text-accent-fg shadow-xs transition-transform active:scale-95"
        >
          Explore Groceries
        </Link>
      </div>
    );
  }

  const baseTotal = calculateCartTotal({
    lines: items,
    fulfilment,
    deliveryFeePaise: store.deliveryFeePaise,
  });

  // Calculate total MRP savings
  const totalMrpPaise = items.reduce(
    (sum, i) => sum + (i.mrpPaise ?? i.unitPricePaise) * i.qty,
    0,
  );
  const mrpSavings = Math.max(0, totalMrpPaise - baseTotal.subtotalPaise);

  // Free delivery calculation
  const freeDeliveryEligible =
    fulfilment === "delivery" && baseTotal.subtotalPaise >= store.minFreeDeliveryPaise;
  const deliveryFee =
    fulfilment === "pickup" ? 0 : freeDeliveryEligible ? 0 : store.deliveryFeePaise;

  // Coupon discount logic
  let couponDiscountPaise = 0;
  if (appliedCoupon === "CAMPUS50") {
    couponDiscountPaise = Math.min(5000, baseTotal.subtotalPaise); // ₹50 off
  } else if (appliedCoupon === "FRESH10") {
    couponDiscountPaise = Math.round(baseTotal.subtotalPaise * 0.1); // 10% off
  }

  const finalTotalPaise = Math.max(
    0,
    baseTotal.subtotalPaise + deliveryFee - couponDiscountPaise,
  );

  const applyCoupon = (e: React.FormEvent) => {
    e.preventDefault();
    const code = couponCode.trim().toUpperCase();
    if (code === "CAMPUS50" || code === "FRESH10") {
      setAppliedCoupon(code);
      setCouponError(null);
    } else {
      setCouponError("Invalid coupon. Try CAMPUS50 or FRESH10");
    }
  };

  const removeCoupon = () => {
    setAppliedCoupon(null);
    setCouponCode("");
    setCouponError(null);
  };

  const amountNeededForFreeDelivery = Math.max(
    0,
    store.minFreeDeliveryPaise - baseTotal.subtotalPaise,
  );

  return (
    <div className="flex flex-col gap-4 p-4 pb-28">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">Shopping Cart</h1>
          <p className="text-xs text-muted">
            {items.reduce((s, i) => s + i.qty, 0)} items in your basket
          </p>
        </div>
        <button
          onClick={() => {
            if (confirm("Are you sure you want to clear your cart?")) clear();
          }}
          className="text-xs font-semibold text-danger hover:underline"
        >
          Clear Cart
        </button>
      </div>

      {/* Fulfilment Toggle */}
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
          <span>Pickup ({store.pickupEtaMinutes}m · Free)</span>
        </button>
        <button
          aria-pressed={fulfilment === "delivery"}
          onClick={() => setFulfilment("delivery")}
          className={`flex min-h-10 items-center justify-center gap-1.5 rounded-[9px] text-xs font-semibold transition-all ${
            fulfilment === "delivery"
              ? "bg-accent text-accent-fg shadow-xs"
              : "text-muted hover:text-fg"
          }`}
        >
          <span>🛵</span>
          <span>Delivery ({store.deliveryEtaMinutes}m)</span>
        </button>
      </div>

      {/* Free Delivery Banner (for delivery mode) */}
      {fulfilment === "delivery" && (
        <div className="flex items-center gap-2 rounded-[10px] bg-emerald-500/10 p-3 text-xs text-emerald-800 dark:text-emerald-300">
          <span>{freeDeliveryEligible ? "🎉" : "🚚"}</span>
          <span className="font-medium">
            {freeDeliveryEligible
              ? "Awesome! You have unlocked FREE store delivery!"
              : `Add ${formatPaise(amountNeededForFreeDelivery)} more to get FREE delivery!`}
          </span>
        </div>
      )}

      {/* Items List */}
      <div className="flex flex-col gap-2 rounded-[16px] border border-border bg-surface p-3 shadow-xs">
        <h2 className="px-1 text-xs font-bold uppercase tracking-wider text-muted">
          Items Added
        </h2>
        <ul className="flex flex-col divide-y divide-border/60">
          {items.map((item) => (
            <li
              key={item.productId}
              className="flex items-center justify-between gap-3 py-3 first:pt-1 last:pb-1"
            >
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <div className="size-12 shrink-0 overflow-hidden rounded-[8px] border border-border bg-neutral-100 dark:bg-neutral-800">
                  <ProductPlaceholder
                    name={item.name}
                    image={item.image}
                    aspect="square"
                  />
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">{item.name}</p>
                  <p className="text-xs text-muted">
                    {item.unit} · {formatPaise(item.unitPricePaise)}
                  </p>
                  <p className="text-xs font-bold text-fg">
                    {formatPaise(item.qty * item.unitPricePaise)}
                  </p>
                </div>
              </div>

              {/* Stepper */}
              <div className="flex items-center gap-1 rounded-[8px] bg-accent/10 p-1 dark:bg-accent/20">
                <button
                  aria-label={`Decrease ${item.name}`}
                  onClick={() => setQty(item.productId, item.qty - 1)}
                  className="flex size-7 items-center justify-center rounded-[6px] bg-surface font-bold text-fg shadow-2xs hover:bg-neutral-100 active:scale-90"
                >
                  {item.qty === 1 ? "🗑️" : "−"}
                </button>
                <span className="w-6 text-center text-xs font-bold" aria-live="polite">
                  {item.qty}
                </span>
                <button
                  aria-label={`Increase ${item.name}`}
                  onClick={() => setQty(item.productId, item.qty + 1)}
                  className="flex size-7 items-center justify-center rounded-[6px] bg-accent font-bold text-accent-fg shadow-2xs hover:opacity-90 active:scale-90"
                >
                  +
                </button>
              </div>
            </li>
          ))}
        </ul>
      </div>

      {/* Coupon Box */}
      <div className="flex flex-col gap-2 rounded-[16px] border border-border bg-surface p-3.5 shadow-xs">
        <h2 className="text-xs font-bold uppercase tracking-wider text-muted">
          Coupons & Offers
        </h2>
        {appliedCoupon ? (
          <div className="flex items-center justify-between rounded-[10px] bg-emerald-500/10 p-2.5 text-xs text-emerald-800 dark:text-emerald-300">
            <div className="flex items-center gap-2">
              <span className="text-base">🎟️</span>
              <div>
                <p className="font-bold">{appliedCoupon} Applied!</p>
                <p className="text-[11px] opacity-80">
                  Saved {formatPaise(couponDiscountPaise)} with this code
                </p>
              </div>
            </div>
            <button
              onClick={removeCoupon}
              className="font-bold text-red-600 hover:underline dark:text-red-400"
            >
              Remove
            </button>
          </div>
        ) : (
          <form onSubmit={applyCoupon} className="flex gap-2">
            <input
              type="text"
              value={couponCode}
              onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
              placeholder="Try CAMPUS50 or FRESH10"
              className="min-h-10 flex-1 rounded-[8px] border border-border bg-bg px-3 text-xs uppercase placeholder:normal-case placeholder:text-muted focus:border-accent focus:outline-none"
            />
            <button
              type="submit"
              disabled={!couponCode.trim()}
              className="min-h-10 rounded-[8px] bg-accent px-4 text-xs font-semibold text-accent-fg disabled:opacity-50"
            >
              Apply
            </button>
          </form>
        )}
        {couponError && <p className="text-xs text-danger">{couponError}</p>}
      </div>

      {/* Delivery Instructions */}
      {fulfilment === "delivery" && (
        <div className="flex flex-col gap-2 rounded-[16px] border border-border bg-surface p-3.5 shadow-xs">
          <h2 className="text-xs font-bold uppercase tracking-wider text-muted">
            Delivery Instructions
          </h2>
          <div className="flex flex-wrap gap-2">
            {INSTRUCTION_TAGS.map((tag) => {
              const selected = selectedInstruction === tag;
              return (
                <button
                  key={tag}
                  type="button"
                  onClick={() => setSelectedInstruction(selected ? null : tag)}
                  className={`rounded-full border px-3 py-1.5 text-xs transition-colors ${
                    selected
                      ? "border-accent bg-accent text-accent-fg font-semibold"
                      : "border-border bg-bg text-muted hover:text-fg"
                  }`}
                >
                  {tag}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Bill Summary */}
      <div className="flex flex-col gap-2.5 rounded-[16px] border border-border bg-surface p-4 text-xs shadow-xs">
        <h2 className="text-xs font-bold uppercase tracking-wider text-muted">
          Bill Details
        </h2>

        <div className="flex justify-between">
          <span className="text-muted">Item Subtotal</span>
          <span className="font-medium text-fg">{formatPaise(baseTotal.subtotalPaise)}</span>
        </div>

        {mrpSavings > 0 && (
          <div className="flex justify-between text-emerald-700 dark:text-emerald-400">
            <span>Product Discount Savings</span>
            <span className="font-semibold">−{formatPaise(mrpSavings)}</span>
          </div>
        )}

        <div className="flex justify-between">
          <span className="text-muted">
            Delivery Fee ({fulfilment === "pickup" ? "Store Pickup" : "Store Delivery"})
          </span>
          <span className="font-medium text-fg">
            {deliveryFee === 0 ? (
              <span className="text-emerald-700 dark:text-emerald-400 font-semibold">FREE</span>
            ) : (
              formatPaise(deliveryFee)
            )}
          </span>
        </div>

        {couponDiscountPaise > 0 && (
          <div className="flex justify-between text-emerald-700 dark:text-emerald-400">
            <span>Coupon Discount ({appliedCoupon})</span>
            <span className="font-semibold">−{formatPaise(couponDiscountPaise)}</span>
          </div>
        )}

        <div className="mt-1 flex items-baseline justify-between border-t border-border pt-2 text-sm font-bold text-fg">
          <span>To Pay</span>
          <span className="text-base font-extrabold text-accent">
            {formatPaise(finalTotalPaise)}
          </span>
        </div>
      </div>

      {/* Bottom Sticky Action Bar */}
      <div className="fixed bottom-14 left-1/2 z-30 w-full max-w-[430px] -translate-x-1/2 p-3">
        <div className="flex items-center justify-between rounded-[14px] border border-border/80 bg-surface/95 p-3 shadow-xl backdrop-blur-md">
          <div>
            <p className="text-[11px] font-medium text-muted">Grand Total</p>
            <p className="text-lg font-extrabold text-fg">{formatPaise(finalTotalPaise)}</p>
          </div>
          <Link
            href="/checkout"
            className="flex min-h-11 items-center justify-center gap-1.5 rounded-[10px] bg-accent px-6 text-sm font-bold text-accent-fg shadow-md shadow-accent/20 transition-transform active:scale-95"
          >
            <span>Proceed to Checkout</span>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
              fill="currentColor"
              className="size-4"
            >
              <path
                fillRule="evenodd"
                d="M3 10a.75.75 0 0 1 .75-.75h10.638L10.23 5.29a.75.75 0 1 1 1.04-1.08l5.5 5.25a.75.75 0 0 1 0 1.08l-5.5 5.25a.75.75 0 1 1-1.04-1.08l4.158-3.96H3.75A.75.75 0 0 1 3 10Z"
                clipRule="evenodd"
              />
            </svg>
          </Link>
        </div>
      </div>
    </div>
  );
}
