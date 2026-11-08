"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { z } from "zod";
import { Button } from "@/components/ui/Button";
import { useHydrated } from "@/lib/hooks/useHydrated";
import { formatPaise } from "@/lib/format/money";
import { calculateCartTotal, type Fulfilment } from "@/lib/pricing/calculateCartTotal";
import { store } from "@/lib/placeholder/catalog";
import { PAYMENT_METHODS, type PaymentMethod, type PlaceholderOrder } from "@/lib/placeholder/orders";
import { usePrefsStore } from "@/features/home/prefsStore";
import { useCartStore } from "@/features/cart/cartStore";
import { useAuthStore } from "@/features/profile/authStore";
import { useOrdersStore } from "@/features/orders/ordersStore";
import { describeLocation, useLocationStore } from "@/features/location/locationStore";

const TIP_OPTIONS_PAISE = [0, 1000, 2000, 3000];

const PAYMENT_LABELS: Record<PaymentMethod, string> = {
  cod: "Cash on delivery",
  upi: "UPI",
  card: "Card",
};

const addressSchema = z.object({
  line: z.string().trim().min(5, "Enter your full address"),
  pincode: z.string().regex(/^\d{6}$/, "Enter a 6-digit pincode"),
});

function createDemoOrder({
  fulfilment,
  paymentMethod,
  totalPaise,
  itemCount,
}: {
  fulfilment: Fulfilment;
  paymentMethod: PaymentMethod;
  totalPaise: number;
  itemCount: number;
}): PlaceholderOrder {
  return {
    id: `ord-${Date.now().toString().slice(-6)}`,
    createdAt: new Date().toISOString(),
    fulfilment,
    status: paymentMethod === "cod" ? "received" : "paid",
    paymentMethod,
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
  const selectedId = useLocationStore((s) => s.selectedId);
  const currentAddress = useLocationStore((s) => s.currentAddress);
  const location = describeLocation(selectedId, currentAddress);

  const [line, setLine] = useState(location.address);
  const [pincode, setPincode] = useState("");
  const [tipPaise, setTipPaise] = useState(0);
  const [payment, setPayment] = useState<PaymentMethod>("upi");
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
    fulfilment,
    deliveryFeePaise: store.deliveryFeePaise,
    tipPaise,
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
      paymentMethod: payment,
      totalPaise: total.totalPaise,
      itemCount: items.reduce((sum, i) => sum + i.qty, 0),
    });
    addOrder(order);
    router.push(`/orders/${order.id}`);
    clearCart();
  };

  return (
    <div className="flex flex-col gap-4 p-4">
      <h1 className="text-xl font-semibold">Checkout</h1>

      <section className="flex flex-col gap-3 rounded-[12px] border-[0.5px] border-border bg-surface p-4">
        <h2 className="text-sm font-semibold">Items</h2>
        <ul className="flex flex-col gap-3">
          {items.map((item) => (
            <li key={item.productId} className="flex items-center gap-3">
              <span
                aria-hidden="true"
                className="flex size-11 shrink-0 items-center justify-center rounded-[8px] border-[0.5px] border-border bg-bg text-xs font-semibold text-muted"
              >
                {initials(item.name)}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm">{item.name}</p>
                <p className="text-xs text-muted">{item.qty} × {formatPaise(item.unitPricePaise)}</p>
              </div>
              <p className="text-sm font-medium">{formatPaise(item.qty * item.unitPricePaise)}</p>
            </li>
          ))}
        </ul>
      </section>

      <section className="flex flex-col gap-2 rounded-[12px] border-[0.5px] border-border bg-surface p-4">
        {fulfilment === "pickup" ? (
          <>
            <h2 className="text-sm font-semibold">Pickup</h2>
            <p className="text-sm">Ready in about {store.pickupEtaMinutes} min at {store.name}, {store.address}.</p>
          </>
        ) : (
          <>
            <h2 className="text-sm font-semibold">Delivery address</h2>
            <p className="text-xs text-muted">Delivering to {location.label}. Change it from the home screen.</p>
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

      {fulfilment === "delivery" && (
        <section className="flex flex-col gap-2 rounded-[12px] border-[0.5px] border-border bg-surface p-4">
          <h2 className="text-sm font-semibold">Tip for your delivery partner</h2>
          <div role="group" aria-label="Tip" className="grid grid-cols-4 gap-2">
            {TIP_OPTIONS_PAISE.map((tip) => (
              <button
                key={tip}
                aria-pressed={tipPaise === tip}
                onClick={() => setTipPaise(tip)}
                className={`min-h-11 rounded-[8px] border-[0.5px] text-sm ${tipPaise === tip ? "border-accent bg-accent text-accent-fg" : "border-border"}`}
              >
                {tip === 0 ? "None" : formatPaise(tip)}
              </button>
            ))}
          </div>
        </section>
      )}

      <section className="flex flex-col gap-2 rounded-[12px] border-[0.5px] border-border bg-surface p-4">
        <h2 className="text-sm font-semibold">Payment</h2>
        <div role="radiogroup" aria-label="Payment method" className="flex flex-col gap-2">
          {PAYMENT_METHODS.map((method) => (
            <button
              key={method}
              role="radio"
              aria-checked={payment === method}
              onClick={() => setPayment(method)}
              className={`flex min-h-11 items-center justify-between rounded-[8px] border-[0.5px] px-3 text-sm ${payment === method ? "border-accent" : "border-border"}`}
            >
              <span>{PAYMENT_LABELS[method]}</span>
              <span aria-hidden="true" className={`size-4 rounded-full border-[0.5px] ${payment === method ? "bg-accent" : "border-border"}`} />
            </button>
          ))}
        </div>
      </section>

      <section className="flex flex-col gap-2 rounded-[12px] border-[0.5px] border-border bg-surface p-4 text-sm">
        <div className="flex justify-between"><span className="text-muted">Subtotal</span><span>{formatPaise(total.subtotalPaise)}</span></div>
        <div className="flex justify-between"><span className="text-muted">Delivery fee</span><span>{fulfilment === "delivery" ? formatPaise(total.deliveryFeePaise) : "Free"}</span></div>
        {fulfilment === "delivery" && (
          <div className="flex justify-between"><span className="text-muted">Tip</span><span>{total.tipPaise ? formatPaise(total.tipPaise) : "None"}</span></div>
        )}
        <div className="flex justify-between border-t-[0.5px] border-border pt-2 font-semibold"><span>Total</span><span>{formatPaise(total.totalPaise)}</span></div>
      </section>

      <Button onClick={placeOrder}>
        {payment === "cod" ? "Place order (pay on delivery)" : `Place order and pay by ${PAYMENT_LABELS[payment]}`}
      </Button>
      <p className="text-xs text-muted">
        Demo checkout: no payment is taken. Real UPI and card payments via Razorpay come with the backend phase.
      </p>
    </div>
  );
}

function initials(name: string): string {
  return name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
}
