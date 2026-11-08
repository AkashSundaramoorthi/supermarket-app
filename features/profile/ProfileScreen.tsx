"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useHydrated } from "@/lib/hooks/useHydrated";
import { store } from "@/lib/placeholder/catalog";
import { useLocationStore } from "@/features/location/locationStore";
import { useCartStore } from "@/features/cart/cartStore";
import { useAuthStore } from "./authStore";

export function ProfileScreen() {
  const router = useRouter();
  const hydrated = useHydrated();
  const phone = useAuthStore((s) => s.phone);
  const savedName = useAuthStore((s) => s.name);
  const setName = useAuthStore((s) => s.setName);
  const logout = useAuthStore((s) => s.logout);
  const savedLocations = useLocationStore((s) => s.savedLocations);
  const removeLocation = useLocationStore((s) => s.removeLocation);

  const [edited, setEdited] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [showFaq, setShowFaq] = useState(false);

  const draft = edited ?? savedName;

  if (!hydrated) return null;

  if (!phone) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 p-6 text-center">
        <div className="flex size-16 items-center justify-center rounded-full bg-accent/10 text-3xl">
          👤
        </div>
        <h1 className="text-xl font-bold">Your Account</h1>
        <p className="max-w-xs text-xs text-muted">
          Log in with your phone number to manage your profile, delivery locations, and order history.
        </p>
        <Link
          href="/login"
          className="mt-2 flex min-h-11 items-center justify-center rounded-[10px] bg-accent px-6 text-sm font-semibold text-accent-fg shadow-xs transition-transform active:scale-95"
        >
          Log In / Sign Up
        </Link>
      </div>
    );
  }

  const handleSaveName = (e: React.FormEvent) => {
    e.preventDefault();
    setName(draft);
    setEdited(null);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2000);
  };

  return (
    <div className="flex flex-col gap-4 p-4 pb-20">
      <h1 className="text-xl font-bold">Profile & Settings</h1>

      {/* Profile Header Card */}
      <div className="flex items-center gap-3 rounded-[16px] border border-border bg-surface p-4 shadow-xs">
        <div className="flex size-14 shrink-0 items-center justify-center rounded-full bg-gradient-to-tr from-emerald-700 to-teal-600 text-lg font-bold text-white shadow-xs">
          {savedName.slice(0, 2).toUpperCase() || "ST"}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <h2 className="truncate text-base font-bold text-fg">{savedName}</h2>
            <span className="rounded-full bg-accent/10 px-2 py-0.2 text-[10px] font-bold text-accent">
              Member
            </span>
          </div>
          <p className="text-xs text-muted">+91 {phone}</p>
          <p className="text-[11px] text-emerald-700 dark:text-emerald-400 font-medium">
            FreshMart Supermarket Member
          </p>
        </div>
      </div>

      {/* Edit Name Form */}
      <form
        onSubmit={handleSaveName}
        className="flex flex-col gap-2.5 rounded-[16px] border border-border bg-surface p-4 shadow-xs"
      >
        <div className="flex items-center justify-between">
          <label htmlFor="name-input" className="text-xs font-bold uppercase tracking-wider text-muted">
            Display Name
          </label>
          {saveSuccess && (
            <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
              ✓ Saved!
            </span>
          )}
        </div>

        <div className="flex gap-2">
          <input
            id="name-input"
            value={draft}
            onChange={(e) => setEdited(e.target.value)}
            placeholder="Your Name"
            maxLength={50}
            className="min-h-10 flex-1 rounded-[8px] border border-border bg-bg px-3 text-xs focus:border-accent focus:outline-none"
          />
          <button
            type="submit"
            disabled={draft.trim() === savedName}
            className="min-h-10 rounded-[8px] bg-accent px-4 text-xs font-bold text-accent-fg shadow-2xs disabled:opacity-40"
          >
            Save
          </button>
        </div>
      </form>

      {/* Saved Delivery Spots */}
      <div className="flex flex-col gap-2.5 rounded-[16px] border border-border bg-surface p-4 shadow-xs">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold uppercase tracking-wider text-muted">
            Saved Addresses ({savedLocations.length})
          </h3>
          <Link href="/" className="text-xs font-semibold text-accent hover:underline">
            Manage on Home
          </Link>
        </div>

        {savedLocations.length === 0 ? (
          <p className="text-xs text-muted pt-1">
            No saved addresses yet. You can save any custom location (e.g. Home, Work, Apartment) from the header address picker or at checkout.
          </p>
        ) : (
          <ul className="flex flex-col divide-y divide-border/60">
            {savedLocations.map((loc) => (
              <li key={loc.id} className="flex items-center justify-between py-2 text-xs">
                <div className="min-w-0 pr-2">
                  <p className="font-bold text-fg truncate">🏠 {loc.name}</p>
                  <p className="text-muted text-[11px] truncate">{loc.address}</p>
                </div>
                <button
                  onClick={() => removeLocation(loc.id)}
                  className="shrink-0 text-muted hover:text-danger p-1 text-xs"
                  title="Remove location"
                >
                  🗑️
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Store Perks Card */}
      <div className="flex flex-col gap-2 rounded-[16px] bg-gradient-to-r from-emerald-800 to-teal-800 p-4 text-white shadow-xs">
        <div className="flex items-center gap-2">
          <span className="text-xl">🛍️</span>
          <p className="text-sm font-bold">FreshMart Member Perks</p>
        </div>
        <p className="text-xs text-emerald-100">
          Enjoy express 15-minute store deliveries, direct owner pickup with no waiting, and zero surge pricing.
        </p>
      </div>

      {/* Helpful Links */}
      <div className="flex flex-col divide-y divide-border/60 rounded-[16px] border border-border bg-surface px-4 py-2 shadow-xs">
        <Link
          href="/orders"
          className="flex items-center justify-between py-3 text-xs font-semibold hover:text-accent"
        >
          <div className="flex items-center gap-2.5">
            <span>🧾</span>
            <span>Order History & Receipts</span>
          </div>
          <span>→</span>
        </Link>

        <Link
          href="/admin"
          className="flex items-center justify-between py-3 text-xs font-semibold text-emerald-700 hover:text-emerald-800 dark:text-emerald-400"
        >
          <div className="flex items-center gap-2.5">
            <span>📊</span>
            <span>Store Owner Analytics & Supply</span>
          </div>
          <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
            Admin
          </span>
        </Link>

        <button
          onClick={() => setShowFaq(!showFaq)}
          className="flex items-center justify-between py-3 text-left text-xs font-semibold hover:text-accent"
        >
          <div className="flex items-center gap-2.5">
            <span>ℹ️</span>
            <span>Store Timings & Customer Help</span>
          </div>
          <span>{showFaq ? "▲" : "▼"}</span>
        </button>

        {showFaq && (
          <div className="py-3 text-xs text-muted flex flex-col gap-1.5 bg-neutral-50 p-3 rounded-[8px] dark:bg-neutral-800/50">
            <p><strong>Store Name:</strong> {store.name}</p>
            <p><strong>Location:</strong> {store.address}</p>
            <p><strong>Hours:</strong> {store.timings}</p>
            <p><strong>Helpline:</strong> {store.phone}</p>
            <p className="text-[11px] pt-1">Free delivery threshold: Over ₹199</p>
          </div>
        )}
      </div>

      {/* Log out */}
      <button
        type="button"
        onClick={() => {
          if (confirm("Are you sure you want to log out?")) {
            logout();
            useCartStore.getState().clear();
            router.push("/");
          }
        }}
        className="flex min-h-11 w-full items-center justify-center rounded-[10px] border border-border bg-surface text-xs font-bold text-danger hover:bg-red-500/10 active:scale-[0.99]"
      >
        Log out from account
      </button>
    </div>
  );
}
