"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { z } from "zod";
import { Button } from "@/components/ui/Button";
import { useHydrated } from "@/lib/hooks/useHydrated";
import { formatPaise } from "@/lib/format/money";
import { calculateCartTotal, type Fulfilment } from "@/lib/pricing/calculateCartTotal";
import type { PlaceholderOrder } from "@/lib/placeholder/orders";
import { store } from "@/lib/placeholder/catalog";
import { placeholderUser } from "@/lib/placeholder/user";
import { usePrefsStore } from "@/features/home/prefsStore";
import { useCartStore } from "@/features/cart/cartStore";
import { useAuthStore } from "@/features/profile/authStore";
import { useOrdersStore } from "@/features/orders/ordersStore";

const addressSchema = z.object({
  line: z.string().trim().min(5, "Enter your full address"),
  pincode: z.string().regex(/^\d{6}$/, "Enter a 6-digit pincode"),
});

function createDemoOrder({
  fulfilment,
  totalPaise,
  itemCount,
}: {
  fulfilment: Fulfilment;
  totalPaise: number;
  itemCount: number;
}): PlaceholderOrder {
  return {
    id: `ord-${Date.now().toString().slice(-6)}`,
    createdAt: new Date().toISOString(),
    fulfilment,
    status: "paid",
    totalPaise,
    itemCount,
    collectionCode: fulfilment === "pickup" ? `A${Math.floor(100 + Math.random() * 900)}` : null,
  };
}

export function CheckoutScreen() {
  const router = useRouter();
  const hydrated = useHydrated();
  const phone = useAuthStore((s) => s.phone);
  const items = useCartStore((s) => s.items);
  const clearCart = useCartStore((s) => s.clear);
  const addOrder = useOrdersStore((s) => s.addOrder);
  const fulfilment = usePrefsStore((s) => s.fulfilment) ?? "pickup";
  const [line, setLine] = useState(placeholderUser.address);
  const [pincode, setPincode] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  if (!hydrated) return null;

  if (!phone) {
    return (
      <div className="flex flex-col gap-3 p-4">
        <h1 className="text-xl font-semibold">Log in to checkout</h1>
        <p className="text-sm text-muted">Your cart is saved. Log in to place the order.</p>
        <Link href="/login?next=/checkout" className="flex min-h-11 items-center justify-center rounded-[8px] bg-accent text-sm font-medium text-accent-fg">
          Log in
        </Link>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="flex flex-col gap-3 p-4">
        <h1 className="text-xl font-semibold">Nothing to check out</h1>
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

  const validate = () => {
    if (fulfilment === "pickup") return true;
    const result = addressSchema.safeParse({ line, pincode });
    if (result.success) {
      setErrors({});
      return true;
    }
    setErrors(Object.fromEntries(result.error.issues.map((i) => [i.path[0] as string, i.message])));
    return false;
  };

  const placeOrder = () => {
    if (!validate()) return;
    const order = createDemoOrder({
      fulfilment,
      totalPaise: total.totalPaise,
      itemCount: items.reduce((sum, i) => sum + i.qty, 0),
    });
    addOrder(order);
    clearCart();
    router.push(`/orders/${order.id}`);
  };

  return (
    <div className="flex flex-col gap-4 p-4">
      <h1 className="text-xl font-semibold">Checkout</h1>

      <section className="flex flex-col gap-2 rounded-[12px] border-[0.5px] border-border bg-surface p-4">
        {fulfilment === "pickup" ? (
          <>
            <h2 className="text-sm font-semibold">Pickup</h2>
            <p className="text-sm">Ready in about {store.pickupEtaMinutes} min at {store.name}, {store.address}.</p>
          </>
        ) : (
          <>
            <h2 className="text-sm font-semibold">Delivery address</h2>
            <label className="flex flex-col gap-1 text-sm">
              Address
              <input value={line} onChange={(e) => setLine(e.target.value)} className="min-h-11 rounded-[8px] border-[0.5px] border-border bg-bg px-3" />
              {errors.line && <span className="text-danger">{errors.line}</span>}
            </label>
            <label className="flex flex-col gap-1 text-sm">
              Pincode
              <input inputMode="numeric" value={pincode} onChange={(e) => setPincode(e.target.value)} className="min-h-11 rounded-[8px] border-[0.5px] border-border bg-bg px-3" />
              {errors.pincode && <span className="text-danger">{errors.pincode}</span>}
            </label>
          </>
        )}
      </section>

      <section className="flex flex-col gap-2 rounded-[12px] border-[0.5px] border-border bg-surface p-4 text-sm">
        <div className="flex justify-between"><span className="text-muted">Subtotal</span><span>{formatPaise(total.subtotalPaise)}</span></div>
        <div className="flex justify-between"><span className="text-muted">Student discount</span><span>{total.discountPaise ? `-${formatPaise(total.discountPaise)}` : "None"}</span></div>
        <div className="flex justify-between"><span className="text-muted">Delivery fee</span><span>{fulfilment === "delivery" ? formatPaise(total.deliveryFeePaise) : "Free"}</span></div>
        <div className="flex justify-between border-t-[0.5px] border-border pt-2 font-semibold"><span>Total</span><span>{formatPaise(total.totalPaise)}</span></div>
      </section>

      <Button onClick={placeOrder}>Place order (demo, no charge)</Button>
      <p className="text-xs text-muted">
        Demo checkout: no payment is taken. Razorpay UPI payment comes with the backend phase.
      </p>
    </div>
  );
}
