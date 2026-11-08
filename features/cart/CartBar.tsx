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
  const { totalPaise } = calculateCartTotal({
    lines: items,
    fulfilment,
    deliveryFeePaise: store.deliveryFeePaise,
  });

  return (
    <div className="px-3 pb-2 animate-tap">
      <Link
        href="/cart"
        className="flex min-h-13 items-center justify-between rounded-[12px] bg-accent px-4 py-2.5 text-accent-fg shadow-lg shadow-accent/25 transition-transform active:scale-[0.98]"
      >
        <div className="flex flex-col">
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-semibold uppercase tracking-wider bg-white/20 rounded-xs px-1.5 py-0.5">
              {fulfilment === "pickup" ? `Pickup in ${store.pickupEtaMinutes}m` : `Delivery in ${store.deliveryEtaMinutes}m`}
            </span>
            <span className="text-xs opacity-90">
              {count} {count === 1 ? "item" : "items"}
            </span>
          </div>
          <span className="text-base font-bold tracking-tight">
            {formatPaise(totalPaise)}
          </span>
        </div>

        <div className="flex items-center gap-1.5 text-sm font-semibold">
          <span>View Cart</span>
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
      </Link>
    </div>
  );
}
