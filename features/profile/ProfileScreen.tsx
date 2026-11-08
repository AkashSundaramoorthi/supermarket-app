"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { useHydrated } from "@/lib/hooks/useHydrated";
import { useLocationStore, describeLocation } from "@/features/location/locationStore";
import { useAuthStore } from "./authStore";

export function ProfileScreen() {
  const router = useRouter();
  const hydrated = useHydrated();
  const phone = useAuthStore((s) => s.phone);
  const savedName = useAuthStore((s) => s.name);
  const setName = useAuthStore((s) => s.setName);
  const logout = useAuthStore((s) => s.logout);
  const selectedId = useLocationStore((s) => s.selectedId);
  const currentAddress = useLocationStore((s) => s.currentAddress);
  const [edited, setEdited] = useState<string | null>(null);
  const draft = edited ?? savedName;
  const saved = edited === null;

  if (!hydrated) return null;

  if (!phone) {
    return (
      <div className="flex flex-col gap-4 p-4">
        <h1 className="text-xl font-semibold">Profile</h1>
        <Link href="/login" className="flex min-h-11 items-center justify-center rounded-[8px] bg-accent text-sm font-medium text-accent-fg">
          Log in
        </Link>
      </div>
    );
  }

  const location = describeLocation(selectedId, currentAddress);

  return (
    <div className="flex flex-col gap-4 p-4">
      <h1 className="text-xl font-semibold">Profile</h1>

      <form
        className="flex flex-col gap-3 rounded-[12px] border-[0.5px] border-border bg-surface p-4"
        onSubmit={(e) => {
          e.preventDefault();
          setName(draft);
          setEdited(null);
        }}
      >
        <label className="flex flex-col gap-1 text-sm">
          Name
          <input
            value={draft}
            onChange={(e) => setEdited(e.target.value)}
            placeholder="Your name"
            maxLength={60}
            className="min-h-11 rounded-[8px] border-[0.5px] border-border bg-bg px-3"
          />
        </label>
        <Button type="submit" disabled={draft.trim() === savedName}>
          {saved ? "Saved" : "Save name"}
        </Button>
      </form>

      <section className="flex flex-col gap-1 rounded-[12px] border-[0.5px] border-border bg-surface p-4">
        <h2 className="text-sm font-semibold">Phone number</h2>
        <p className="text-sm">{phone}</p>
        <p className="text-xs text-muted">Phone number cannot be changed.</p>
      </section>

      <section className="flex flex-col gap-1 rounded-[12px] border-[0.5px] border-border bg-surface p-4">
        <h2 className="text-sm font-semibold">Delivery location</h2>
        <p className="text-sm">{location.label}</p>
        <p className="text-xs text-muted">{location.address}</p>
      </section>

      <Button
        variant="secondary"
        onClick={() => {
          logout();
          router.push("/");
        }}
      >
        Log out
      </Button>
    </div>
  );
}
