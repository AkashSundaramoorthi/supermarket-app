"use client";

import Link from "next/link";
import { useState } from "react";
import { z } from "zod";
import { Button } from "@/components/ui/Button";
import { useHydrated } from "@/lib/hooks/useHydrated";
import { formatPaise } from "@/lib/format/money";
import { calculateCartTotal } from "@/lib/pricing/calculateCartTotal";
import { store } from "@/lib/placeholder/catalog";
import { placeholderUser } from "@/lib/placeholder/user";
import { usePrefsStore } from "@/features/home/prefsStore";
import { useCartStore } from "@/features/cart/cartStore";

const addressSchema = z.object({
  line: z.string().trim().min(5, "Enter your full address"),
  pincode: z.string().regex(/^\d{6}$/, "Enter a 6-digit pincode"),
});

export function CheckoutScreen() {
  const hydrated = useHydrated();
  const items = useCartStore((s) => s.items);
  const fulfilment = usePrefsStore((s) => s.fulfilment) ?? "pickup";
  const [line, setLine] = useState(placeholderUser.address);
  const [pincode, setPincode] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  if (!hydrated) return null;

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

      <Button disabled onClick={validate} title="Payments are connected in the backend phase">
        Pay with UPI
      </Button>
      <p className="text-xs text-muted">
        Login and Razorpay payment go live in the backend phase. The address form already validates.
      </p>
    </div>
  );
}
