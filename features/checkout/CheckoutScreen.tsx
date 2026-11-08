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
import { reverseGeocodeCoords } from "@/lib/location/reverseGeocode";
import { ProductPlaceholder } from "@/components/ui/ProductPlaceholder";

const TIP_OPTIONS_PAISE = [0, 1000, 2000, 3000];

const PAYMENT_DETAILS: Record<PaymentMethod, { label: string; icon: string; desc: string }> = {
  upi: {
    label: "Direct UPI (QR / GPay / PhonePe / Paytm)",
    icon: "⚡",
    desc: "Scan QR code or 1-tap pay with any UPI app",
  },
  cod: {
    label: "Cash on Delivery",
    icon: "💵",
    desc: "Pay in cash upon doorstep delivery",
  },
};

const addressSchema = z.object({
  line: z.string().trim().min(5, "Enter your full delivery address (e.g. Flat/Building, Street, Landmark)"),
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
  const savedLocations = useLocationStore((s) => s.savedLocations);
  const addLocation = useLocationStore((s) => s.addLocation);
  const location = describeLocation(selectedId, currentAddress, savedLocations);

  const [line, setLine] = useState(
    location.address && location.address !== "Tap to set your delivery location"
      ? location.address
      : "",
  );
  const [saveAsCustom, setSaveAsCustom] = useState(false);
  const [customLocationName, setCustomLocationName] = useState("");
  const [detectingGps, setDetectingGps] = useState(false);
  const [pincode, setPincode] = useState("560001");
  const [tipPaise, setTipPaise] = useState(0);
  const [payment, setPayment] = useState<PaymentMethod>("upi");
  const [utr, setUtr] = useState("");
  const [copiedUpi, setCopiedUpi] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [placing, setPlacing] = useState(false);

  const handleFillGpsAddress = () => {
    if (!navigator.geolocation) {
      setErrors((prev) => ({ ...prev, line: "Geolocation not supported by browser" }));
      return;
    }
    setDetectingGps(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const res = await reverseGeocodeCoords(pos.coords.latitude, pos.coords.longitude);
          setLine(res.formattedAddress);
          if (res.pincode) setPincode(res.pincode);
          if (!customLocationName.trim() && res.suggestedName) {
            setCustomLocationName(res.suggestedName);
          }
          setErrors((prev) => ({ ...prev, line: "" }));
        } catch {
          setLine(`GPS Location (${pos.coords.latitude.toFixed(4)}, ${pos.coords.longitude.toFixed(4)})`);
        } finally {
          setDetectingGps(false);
        }
      },
      () => {
        setDetectingGps(false);
        setErrors((prev) => ({ ...prev, line: "Could not retrieve GPS location. Check browser permissions." }));
      },
      { timeout: 8000 },
    );
  };

  // Pricing calculations
  const subtotalPaise = items.reduce((sum, i) => sum + i.unitPricePaise * i.qty, 0);
  const deliveryFee =
    fulfilment === "pickup"
      ? 0
      : subtotalPaise >= store.minFreeDeliveryPaise
      ? 0
      : store.deliveryFeePaise;

  const total = calculateCartTotal({
    lines: items,
    fulfilment,
    deliveryFeePaise: deliveryFee,
    tipPaise,
  });

  const amountRupees = (total.totalPaise / 100).toFixed(2);
  const storeUpi = process.env.NEXT_PUBLIC_STORE_UPI_ID || store.upiId || "freshmart@okaxis";
  const upiIntentUri = `upi://pay?pa=${storeUpi}&pn=${encodeURIComponent(store.name)}&am=${amountRupees}&cu=INR&tn=${encodeURIComponent("Grocery Order")}`;
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(upiIntentUri)}`;

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

  const validate = () => {
    if (fulfilment === "delivery") {
      const result = addressSchema.safeParse({ line, pincode });
      if (!result.success) {
        setErrors(Object.fromEntries(result.error.issues.map((i) => [i.path[0] as string, i.message])));
        return false;
      }
    }

    if (payment === "upi") {
      const cleanUtr = utr.trim();
      if (!cleanUtr || !/^\d{12}$/.test(cleanUtr)) {
        setErrors({ utr: "Please enter the 12-digit UPI reference number (UTR) from your receipt." });
        return false;
      }
    }

    setErrors({});
    return true;
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
          utr: payment === "upi" ? utr.trim() : undefined,
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
        status: data.status || (payment === "upi" ? "paid" : "received"),
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

      if (fulfilment === "delivery" && saveAsCustom && customLocationName.trim()) {
        addLocation(customLocationName.trim(), `${line}, Pincode: ${pincode}`);
      }

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
          {fulfilment === "pickup" ? "🏪 Store Owner Pickup" : "🛵 Store Delivery"}
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
              <span>Your groceries will be handed over directly by the store owner upon arrival.</span>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h2 className="text-xs font-bold uppercase tracking-wider text-muted">
                  Delivery Address
                </h2>
                <button
                  type="button"
                  onClick={handleFillGpsAddress}
                  disabled={detectingGps}
                  className="flex items-center gap-1 rounded-[6px] bg-accent/10 px-2 py-0.5 text-[10px] font-bold text-accent hover:bg-accent/20 active:scale-[0.98] disabled:opacity-60"
                >
                  <span>📍</span>
                  <span>{detectingGps ? "Detecting..." : "Auto-fill Current Location"}</span>
                </button>
              </div>
              <span className="text-xs font-bold text-accent">⚡ ~{store.deliveryEtaMinutes}m ETA</span>
            </div>

            <div className="flex flex-col gap-2">
              <label className="flex flex-col gap-1 text-xs font-semibold">
                Flat / House / Building Address
                <input
                  value={line}
                  onChange={(e) => setLine(e.target.value)}
                  placeholder="e.g. Flat 402, Green Meadows, 5th Main"
                  className="min-h-10 rounded-[8px] border border-border bg-bg px-3 text-xs focus:border-accent focus:outline-none"
                />
                {errors.line && <span className="text-[11px] text-danger">{errors.line}</span>}
              </label>

              <label className="flex flex-col gap-1 text-xs font-semibold">
                Area Pincode
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

              {/* Save Address Option */}
              <div className="mt-1 flex flex-col gap-2 rounded-[10px] bg-neutral-50 p-2.5 dark:bg-neutral-800/50">
                <label className="flex items-center gap-2 text-xs font-medium cursor-pointer">
                  <input
                    type="checkbox"
                    checked={saveAsCustom}
                    onChange={(e) => setSaveAsCustom(e.target.checked)}
                    className="rounded text-accent focus:ring-accent"
                  />
                  <span>Save this address for future orders</span>
                </label>
                {saveAsCustom && (
                  <input
                    type="text"
                    value={customLocationName}
                    onChange={(e) => setCustomLocationName(e.target.value)}
                    placeholder="Name this location (e.g. Home, Office, Villa 12)"
                    maxLength={35}
                    className="min-h-9 rounded-[6px] border border-border bg-surface px-2.5 text-xs focus:border-accent focus:outline-none"
                  />
                )}
              </div>
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

      {/* Delivery Tip */}
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

      {/* Payment Options - ONLY Direct UPI & Cash on Delivery */}
      <section className="flex flex-col gap-3 rounded-[16px] border border-border bg-surface p-4 shadow-xs">
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
                onClick={() => {
                  setPayment(method);
                  setErrors((prev) => ({ ...prev, utr: "" }));
                }}
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

        {/* Dynamic Direct UPI Payment Box */}
        {payment === "upi" && (
          <div className="flex flex-col items-center gap-3 rounded-[12px] border border-accent/30 bg-accent/5 p-4 text-center mt-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-accent">
              Scan & Pay ₹{amountRupees} with any UPI App
            </span>

            {/* Dynamic Scannable QR Code */}
            <div className="flex flex-col items-center justify-center p-2.5 rounded-[12px] bg-white border border-border shadow-xs">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={qrCodeUrl}
                alt="UPI Payment QR Code"
                className="size-44 object-contain rounded"
              />
            </div>

            {/* Store UPI ID badge */}
            <div className="flex items-center gap-2 rounded-[8px] bg-surface px-3 py-1.5 border border-border text-xs">
              <span className="text-muted">UPI ID:</span>
              <span className="font-mono font-bold text-fg">{storeUpi}</span>
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(storeUpi);
                  setCopiedUpi(true);
                  setTimeout(() => setCopiedUpi(false), 2000);
                }}
                className="text-[10px] font-bold text-accent hover:underline ml-1"
              >
                {copiedUpi ? "✓ Copied" : "Copy"}
              </button>
            </div>

            {/* Mobile UPI Intent Button */}
            <a
              href={upiIntentUri}
              className="flex min-h-10 w-full items-center justify-center gap-2 rounded-[8px] bg-accent font-semibold text-xs text-accent-fg shadow-2xs transition-transform hover:opacity-95 active:scale-[0.98]"
            >
              <span>⚡</span>
              <span>Open in GPay / PhonePe / Paytm</span>
            </a>

            {/* 12-digit UTR Verification Field */}
            <div className="flex flex-col gap-1 w-full text-left pt-1">
              <div className="flex items-center justify-between">
                <label htmlFor="utr-input" className="text-xs font-semibold text-fg">
                  Enter 12-digit UPI Ref / UTR
                </label>
                <button
                  type="button"
                  onClick={() => {
                    const demoUtr = `4${Date.now().toString().slice(-11)}`;
                    setUtr(demoUtr);
                    setErrors((prev) => ({ ...prev, utr: "" }));
                  }}
                  className="text-[10px] font-bold text-accent hover:underline"
                >
                  Auto-fill Test UTR
                </button>
              </div>
              <input
                id="utr-input"
                inputMode="numeric"
                maxLength={12}
                value={utr}
                onChange={(e) => {
                  setUtr(e.target.value.replace(/\D/g, ""));
                  setErrors((prev) => ({ ...prev, utr: "" }));
                }}
                placeholder="e.g. 412389123456"
                className="min-h-10 w-full rounded-[8px] border border-border bg-surface px-3 text-sm font-mono tracking-widest text-center focus:border-accent focus:outline-none"
              />
              {errors.utr && <span className="text-[11px] text-danger">{errors.utr}</span>}
              <p className="text-[10px] text-muted text-center pt-0.5">
                After paying in your UPI app, enter the 12-digit UPI reference number shown on the receipt.
              </p>
            </div>
          </div>
        )}
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
              <span className="text-emerald-700 dark:text-emerald-400">FREE</span>
            ) : (
              formatPaise(total.deliveryFeePaise)
            )}
          </span>
        </div>
        {total.tipPaise > 0 && (
          <div className="flex justify-between">
            <span className="text-muted">Delivery Tip</span>
            <span className="font-semibold text-fg">{formatPaise(total.tipPaise)}</span>
          </div>
        )}
        <div className="my-1 border-t border-border" />
        <div className="flex justify-between text-sm font-bold">
          <span>To Pay</span>
          <span className="text-fg">{formatPaise(total.totalPaise)}</span>
        </div>
      </section>

      {/* Errors & CTA */}
      <div className="flex flex-col gap-2 pt-2">
        {errors.form && (
          <p className="rounded-[8px] bg-red-500/10 p-2.5 text-center text-xs text-danger">
            {errors.form}
          </p>
        )}

        <Button
          onClick={placeOrder}
          disabled={placing}
          className="min-h-12 w-full text-sm font-bold shadow-xs active:scale-[0.99]"
        >
          {placing ? (
            <div className="flex items-center gap-2">
              <div className="size-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              <span>Verifying & placing order...</span>
            </div>
          ) : payment === "upi" ? (
            `Verify UTR & Place Order (${formatPaise(total.totalPaise)})`
          ) : (
            `Place Order with Cash on Delivery (${formatPaise(total.totalPaise)})`
          )}
        </Button>
      </div>
    </div>
  );
}
