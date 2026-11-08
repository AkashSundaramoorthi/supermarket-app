"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { z } from "zod";
import { Button } from "@/components/ui/Button";
import { useHydrated } from "@/lib/hooks/useHydrated";
import { formatPaise } from "@/lib/format/money";
import { calculateCartTotal } from "@/lib/pricing/calculateCartTotal";
import { store } from "@/lib/placeholder/catalog";
import { PAYMENT_METHODS, type PaymentMethod, type PlaceholderOrder } from "@/lib/placeholder/orders";
import { usePrefsStore } from "@/features/home/prefsStore";
import { useCartStore } from "@/features/cart/cartStore";
import { useAuthStore } from "@/features/profile/authStore";
import { useOrdersStore } from "@/features/orders/ordersStore";
import { describeLocation, useLocationStore } from "@/features/location/locationStore";
import { ProductPlaceholder } from "@/components/ui/ProductPlaceholder";
import { openRazorpayCheckout } from "@/lib/razorpay/checkout";

const TIP_OPTIONS_PAISE = [0, 1000, 2000, 3000];

const PAYMENT_DETAILS: Record<PaymentMethod, { label: string; icon: string; desc: string }> = {
  upi: { label: "UPI Instant Pay", icon: "📱", desc: "GPay, PhonePe, Paytm or UPI ID" },
  card: { label: "Credit / Debit Card", icon: "💳", desc: "Visa, Mastercard, RuPay" },
  cod: { label: "Cash on Delivery", icon: "💵", desc: "Pay with cash/UPI upon arrival" },
};

const addressSchema = z.object({
  line: z.string().trim().min(5, "Enter your full address (e.g. Room/Hostel)"),
  pincode: z.string().regex(/^\d{6}$/, "Enter a valid 6-digit pincode"),
});

export function CheckoutScreen() {
  const router = useRouter();
  const hydrated = useHydrated();
  const phone = useAuthStore((s) => s.phone);
  const login = useAuthStore((s) => s.login);
  const items = useCartStore((s) => s.items);
  const clearCart = useCartStore((s) => s.clear);
  const addOrder = useOrdersStore((s) => s.addOrder);
  const fulfilment = usePrefsStore((s) => s.fulfilment) ?? "pickup";
  const selectedId = useLocationStore((s) => s.selectedId);
  const currentAddress = useLocationStore((s) => s.currentAddress);
  const location = describeLocation(selectedId, currentAddress);

  const [line, setLine] = useState(location.address || "Hostel Block B, Room 304");
  const [pincode, setPincode] = useState("560001");
  const [tipPaise, setTipPaise] = useState(0);
  const [payment, setPayment] = useState<PaymentMethod>("upi");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [placing, setPlacing] = useState(false);

  if (!hydrated) return null;

  if (!phone) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 p-6 text-center">
        <div className="flex size-16 items-center justify-center rounded-full bg-accent/10 text-3xl">
          🔒
        </div>
        <h1 className="text-xl font-bold">Log in to complete checkout</h1>
        <p className="max-w-xs text-xs text-muted">
          Your items are safely preserved in your cart. Sign in with your mobile number to finish ordering.
        </p>

        <div className="flex w-full flex-col gap-2 pt-2">
          <button
            onClick={() => {
              login("9876543210");
            }}
            className="flex min-h-12 w-full items-center justify-center gap-2 rounded-[10px] bg-accent font-semibold text-accent-fg shadow-xs transition-transform active:scale-[0.98]"
          >
            <span>⚡</span>
            <span>1-Tap Demo Sign In (9876543210)</span>
          </button>

          <Link
            href="/login?next=/checkout"
            className="flex min-h-11 items-center justify-center rounded-[10px] border border-border bg-surface text-sm font-semibold hover:border-accent"
          >
            Custom Mobile Login
          </Link>
        </div>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3 p-6 text-center">
        <span className="text-4xl">🛒</span>
        <h1 className="text-xl font-bold">Nothing to check out</h1>
        <p className="text-xs text-muted">Your cart is currently empty.</p>
        <Link
          href="/"
          className="mt-2 rounded-[8px] bg-accent px-5 py-2.5 text-xs font-semibold text-accent-fg"
        >
          Browse Groceries
        </Link>
      </div>
    );
  }

  const freeDelivery = fulfilment === "delivery" && items.reduce((s, i) => s + i.qty * i.unitPricePaise, 0) >= store.minFreeDeliveryPaise;
  const deliveryFee = fulfilment === "pickup" ? 0 : freeDelivery ? 0 : store.deliveryFeePaise;

  const total = calculateCartTotal({
    lines: items,
    fulfilment,
    deliveryFeePaise: deliveryFee,
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

  const placeOrder = async () => {
    if (!validate()) return;
    setPlacing(true);

    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: items.map((i) => ({ productId: i.productId, qty: i.qty })),
          fulfilment,
          paymentMethod: payment,
          deliveryAddress: fulfilment === "delivery" ? { line, pincode } : undefined,
          tipPaise,
          phone,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setErrors({ form: data.error || "Failed to create order" });
        setPlacing(false);
        return;
      }

      const orderData: PlaceholderOrder = {
        id: data.orderId || `ord-${Date.now().toString().slice(-6)}`,
        createdAt: new Date().toISOString(),
        fulfilment: data.fulfilment,
        status: data.status,
        paymentMethod: data.paymentMethod,
        totalPaise: data.totalPaise,
        itemCount: items.reduce((sum, i) => sum + i.qty, 0),
        collectionCode: data.collectionCode,
        items: items.map((i) => ({
          name: i.name,
          qty: i.qty,
          unitPricePaise: i.unitPricePaise,
        })),
        address: fulfilment === "delivery" ? `${line}, Pincode: ${pincode}` : undefined,
      };

      // If Razorpay live online payment
      if (
        (payment === "upi" || payment === "card") &&
        data.razorpayOrderId &&
        !data.razorpayOrderId.startsWith("order_sim_")
      ) {
        try {
          await openRazorpayCheckout({
            key: data.razorpayKeyId,
            amount: data.totalPaise,
            currency: "INR",
            name: store.name,
            description: `Order ${data.orderNumber}`,
            order_id: data.razorpayOrderId,
            prefill: {
              contact: phone,
            },
            handler: () => {
              orderData.status = "paid";
              addOrder(orderData);
              clearCart();
              router.push(`/orders/${orderData.id}`);
            },
            modal: {
              ondismiss: () => {
                setPlacing(false);
              },
            },
          });
          return;
        } catch (rzpErr) {
          console.warn("Razorpay script not available, falling back to simulated order placement:", rzpErr);
        }
      }

      // Default / COD / Dev order completion
      addOrder(orderData);
      clearCart();
      router.push(`/orders/${orderData.id}`);
    } catch (err: unknown) {
      console.error("Order placement failed:", err);
      setErrors({ form: "Network error creating order. Please retry." });
      setPlacing(false);
    }
  };

  return (
    <div className="flex flex-col gap-4 p-4 pb-12">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Checkout</h1>
        <span className="rounded-full bg-accent/10 px-2.5 py-0.5 text-xs font-semibold text-accent">
          {fulfilment === "pickup" ? "🏪 Store Pickup" : "🛵 Campus Delivery"}
        </span>
      </div>

      {/* Fulfilment Details */}
      <section className="flex flex-col gap-2.5 rounded-[16px] border border-border bg-surface p-4 shadow-xs">
        {fulfilment === "pickup" ? (
          <div className="flex flex-col gap-1">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-bold uppercase tracking-wider text-muted">
                Pickup Location
              </h2>
              <span className="text-xs font-semibold text-accent">Ready in ~15m</span>
            </div>
            <p className="text-sm font-bold text-fg">{store.name}</p>
            <p className="text-xs text-muted">{store.address}</p>
            <div className="mt-2 flex items-center gap-2 rounded-[8px] bg-neutral-100 p-2 text-xs text-muted dark:bg-neutral-800">
              <span>ℹ️</span>
              <span>You will receive an in-store counter collection code upon placing this order.</span>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-bold uppercase tracking-wider text-muted">
                Delivery Address
              </h2>
              <span className="text-xs font-bold text-accent">⚡ ~{store.deliveryEtaMinutes}m ETA</span>
            </div>

            <div className="flex flex-col gap-2">
              <label className="flex flex-col gap-1 text-xs font-semibold">
                Room / Flat / Hostel Block
                <input
                  value={line}
                  onChange={(e) => setLine(e.target.value)}
                  placeholder="e.g. Room 304, Block B"
                  className="min-h-10 rounded-[8px] border border-border bg-bg px-3 text-xs focus:border-accent focus:outline-none"
                />
                {errors.line && <span className="text-[11px] text-danger">{errors.line}</span>}
              </label>

              <label className="flex flex-col gap-1 text-xs font-semibold">
                Campus Pincode
                <input
                  inputMode="numeric"
                  maxLength={6}
                  value={pincode}
                  onChange={(e) => setPincode(e.target.value)}
                  placeholder="6-digit pincode"
                  className="min-h-10 rounded-[8px] border border-border bg-bg px-3 text-xs focus:border-accent focus:outline-none"
                />
                {errors.pincode && <span className="text-[11px] text-danger">{errors.pincode}</span>}
              </label>
            </div>
          </div>
        )}
      </section>

      {/* Items Review */}
      <section className="flex flex-col gap-2 rounded-[16px] border border-border bg-surface p-4 shadow-xs">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-bold uppercase tracking-wider text-muted">
            Order Items ({items.length})
          </h2>
          <Link href="/cart" className="text-xs font-semibold text-accent hover:underline">
            Edit
          </Link>
        </div>

        <ul className="flex flex-col divide-y divide-border/60">
          {items.map((item) => (
            <li key={item.productId} className="flex items-center justify-between gap-3 py-2">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="size-9 shrink-0 overflow-hidden rounded-[6px] border border-border bg-neutral-100 dark:bg-neutral-800">
                  <ProductPlaceholder name={item.name} image={item.image} aspect="square" />
                </div>
                <div className="min-w-0">
                  <p className="truncate text-xs font-semibold">{item.name}</p>
                  <p className="text-[11px] text-muted">
                    {item.qty} × {formatPaise(item.unitPricePaise)}
                  </p>
                </div>
              </div>
              <span className="text-xs font-bold text-fg">
                {formatPaise(item.qty * item.unitPricePaise)}
              </span>
            </li>
          ))}
        </ul>
      </section>

      {/* Tip Partner (Delivery only) */}
      {fulfilment === "delivery" && (
        <section className="flex flex-col gap-2 rounded-[16px] border border-border bg-surface p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-bold uppercase tracking-wider text-muted">
              Delivery Partner Tip
            </h2>
            <span className="text-[11px] text-muted">100% goes to rider</span>
          </div>
          <div role="group" aria-label="Tip amount" className="grid grid-cols-4 gap-2">
            {TIP_OPTIONS_PAISE.map((tip) => (
              <button
                key={tip}
                type="button"
                aria-pressed={tipPaise === tip}
                onClick={() => setTipPaise(tip)}
                className={`min-h-10 rounded-[8px] border text-xs font-semibold transition-all ${
                  tipPaise === tip
                    ? "border-accent bg-accent text-accent-fg shadow-2xs"
                    : "border-border bg-bg text-muted hover:text-fg"
                }`}
              >
                {tip === 0 ? "None" : `+${formatPaise(tip)}`}
              </button>
            ))}
          </div>
        </section>
      )}

      {/* Payment Options */}
      <section className="flex flex-col gap-2.5 rounded-[16px] border border-border bg-surface p-4 shadow-xs">
        <h2 className="text-xs font-bold uppercase tracking-wider text-muted">
          Payment Method
        </h2>
        <div role="radiogroup" aria-label="Payment method" className="flex flex-col gap-2">
          {PAYMENT_METHODS.map((method) => {
            const isSelected = payment === method;
            const details = PAYMENT_DETAILS[method];
            return (
              <button
                key={method}
                type="button"
                role="radio"
                aria-checked={isSelected}
                onClick={() => setPayment(method)}
                className={`flex items-center justify-between rounded-[10px] border p-3 text-left transition-all ${
                  isSelected
                    ? "border-accent bg-accent/5 dark:bg-accent/10"
                    : "border-border hover:bg-neutral-50 dark:hover:bg-neutral-800/40"
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="text-xl">{details.icon}</span>
                  <div>
                    <p className={`text-xs ${isSelected ? "font-bold text-accent" : "font-semibold"}`}>
                      {details.label}
                    </p>
                    <p className="text-[11px] text-muted">{details.desc}</p>
                  </div>
                </div>
                <span
                  className={`flex size-4 items-center justify-center rounded-full border ${
                    isSelected ? "border-accent bg-accent text-white" : "border-border"
                  }`}
                >
                  {isSelected && <span className="size-1.5 rounded-full bg-white" />}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      {/* Order Pricing Breakdown */}
      <section className="flex flex-col gap-2 rounded-[16px] border border-border bg-surface p-4 text-xs shadow-xs">
        <div className="flex justify-between">
          <span className="text-muted">Items Subtotal</span>
          <span className="font-semibold text-fg">{formatPaise(total.subtotalPaise)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted">Delivery Fee</span>
          <span className="font-semibold text-fg">
            {total.deliveryFeePaise === 0 ? (
              <span className="text-emerald-700 dark:text-emerald-400 font-bold">FREE</span>
            ) : (
              formatPaise(total.deliveryFeePaise)
            )}
          </span>
        </div>
        {fulfilment === "delivery" && total.tipPaise > 0 && (
          <div className="flex justify-between">
            <span className="text-muted">Delivery Partner Tip</span>
            <span className="font-semibold text-fg">{formatPaise(total.tipPaise)}</span>
          </div>
        )}
        <div className="flex items-baseline justify-between border-t border-border pt-2 text-sm font-bold text-fg">
          <span>Amount to Pay</span>
          <span className="text-base font-extrabold text-accent">
            {formatPaise(total.totalPaise)}
          </span>
        </div>
      </section>

      {errors.form && (
        <p className="rounded-[8px] bg-red-500/10 p-3 text-xs font-semibold text-danger">
          {errors.form}
        </p>
      )}

      {/* Place Order Button */}
      <Button onClick={placeOrder} disabled={placing}>
        {placing ? (
          <span className="flex items-center gap-2">
            <svg
              className="size-4 animate-spin text-current"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
            <span>Processing Order...</span>
          </span>
        ) : (
          `Place Order · ${formatPaise(total.totalPaise)}`
        )}
      </Button>

      <p className="text-center text-[11px] text-muted">
        Campus Fresh Market Secure Demo Ordering · 100% Guaranteed Quality
      </p>
    </div>
  );
}
