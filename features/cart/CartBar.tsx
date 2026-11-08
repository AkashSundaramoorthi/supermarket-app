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
    <Link
      href="/cart"
      className="mx-3 mb-2 flex min-h-14 items-center justify-between rounded-[12px] bg-accent px-4 text-accent-fg"
    >
      <span className="text-sm font-medium">{count} {count === 1 ? "item" : "items"}</span>
      <span className="text-sm font-semibold">{formatPaise(totalPaise)} · View cart</span>
    </Link>
  );
}
