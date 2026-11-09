"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useHydrated } from "@/lib/hooks/useHydrated";
import { formatPaise } from "@/lib/format/money";
import { calculateCartTotal } from "@/lib/pricing/calculateCartTotal";
import { store } from "@/lib/placeholder/catalog";
import { usePrefsStore } from "@/features/home/prefsStore";
import { useCartStore } from "./cartStore";

const HIDDEN_ON = ["/cart", "/checkout"];

export function CartBar() {
  const pathname = usePathname();
  const hydrated = useHydrated();
  const items = useCartStore((s) => s.items);
  const fulfilment = usePrefsStore((s) => s.fulfilment) ?? "pickup";

  if (!hydrated || items.length === 0 || HIDDEN_ON.includes(pathname)) return null;

  const count = items.reduce((sum, i) => sum + i.qty, 0);
  const { subtotalPaise, totalPaise } = calculateCartTotal({
    lines: items,
    fulfilment,
    deliveryFeePaise: store.deliveryFeePaise,
  });

  const freeDeliveryThreshold = store.minFreeDeliveryPaise;
  const remainingForFreeDelivery = Math.max(0, freeDeliveryThreshold - subtotalPaise);
  const freeDeliveryProgress = Math.min(100, Math.round((subtotalPaise / freeDeliveryThreshold) * 100));

  return (
    <div className="px-3 pb-2 animate-tap">
      <Link
        href="/cart"
        className="flex min-h-14 items-center justify-between gap-2 overflow-hidden rounded-[16px] border border-emerald-700/20 bg-emerald-950/95 p-1.5 text-white shadow-xl backdrop-blur-md transition-all hover:shadow-2xl active:scale-[0.99] dark:bg-neutral-900/95 dark:border-neutral-700"
      >
        {/* Left Side: Bigbasket / Blinkit Free Delivery progress indicator */}
        <div className="flex flex-1 items-center gap-2.5 pl-2">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-emerald-800/80 text-emerald-200">
            {fulfilment === "delivery" ? "🛵" : "🏪"}
          </div>
          <div className="flex flex-col min-w-0">
            {fulfilment === "delivery" ? (
              remainingForFreeDelivery > 0 ? (
                <>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[11px] font-bold text-emerald-300">
                      Unlock FREE Delivery
                    </span>
                  </div>
                  <p className="truncate text-[10px] text-emerald-100/80">
                    Add {formatPaise(remainingForFreeDelivery)} more
                  </p>
                  <div className="mt-1 h-1 w-24 overflow-hidden rounded-full bg-white/20">
                    <div
                      className="h-full bg-emerald-400 transition-all duration-300"
                      style={{ width: `${freeDeliveryProgress}%` }}
                    />
                  </div>
                </>
              ) : (
                <>
                  <span className="text-[11px] font-bold text-emerald-300">
                    🎉 FREE Delivery Unlocked!
                  </span>
                  <p className="text-[10px] text-emerald-200/80">
                    Delivery in ~{store.deliveryEtaMinutes} mins
                  </p>
                </>
              )
            ) : (
              <>
                <span className="text-[11px] font-bold text-emerald-300">
                  Store Owner Pickup
                </span>
                <p className="text-[10px] text-emerald-200/80">
                  Ready in ~{store.pickupEtaMinutes} mins
                </p>
              </>
            )}
          </div>
        </div>

        {/* Right Side: High-contrast Green Cart Pill */}
        <div className="flex items-center gap-2 rounded-[12px] bg-accent px-3.5 py-2 font-bold text-accent-fg shadow-sm transition-transform active:scale-95">
          <div className="flex flex-col text-right">
            <span className="text-xs leading-none">
              {count} {count === 1 ? "item" : "items"}
            </span>
            <span className="text-sm font-black tracking-tight">
              {formatPaise(totalPaise)}
            </span>
          </div>
          <div className="flex size-7 items-center justify-center rounded-full bg-black/15">
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
          </div>
        </div>
      </Link>
    </div>
  );
}
