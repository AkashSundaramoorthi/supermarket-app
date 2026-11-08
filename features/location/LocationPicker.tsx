"use client";

import { useState } from "react";
import { useHydrated } from "@/lib/hooks/useHydrated";
import { locations } from "@/lib/placeholder/locations";
import { describeLocation, useLocationStore } from "./locationStore";

export function LocationPicker() {
  const hydrated = useHydrated();
  const selectedId = useLocationStore((s) => s.selectedId);
  const currentAddress = useLocationStore((s) => s.currentAddress);
  const setSelected = useLocationStore((s) => s.setSelected);
  const setCurrent = useLocationStore((s) => s.setCurrent);
  const [open, setOpen] = useState(false);
  const [detecting, setDetecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const current = hydrated ? describeLocation(selectedId, currentAddress) : { label: "Choose location", address: "" };

  const detect = () => {
    if (!navigator.geolocation) {
      setError("Location is not available on this device.");
      return;
    }
    setDetecting(true);
    setError(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCurrent(pos.coords.latitude, pos.coords.longitude);
        setDetecting(false);
        setOpen(false);
      },
      () => {
        setDetecting(false);
        setError("Could not get your location. Allow access or pick one below.");
      },
      { enableHighAccuracy: false, timeout: 10000 },
    );
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex min-h-11 w-full items-center justify-between rounded-[8px] border-[0.5px] border-border bg-surface px-3 text-left"
      >
        <span>
          <span className="block text-xs text-muted">Deliver to</span>
          <span className="block text-sm font-semibold">{current.label}</span>
        </span>
        <span className="text-sm text-accent">Change</span>
      </button>

      {open && (
        <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/40" role="dialog" aria-modal="true" aria-label="Choose location">
          <div className="w-full max-w-[430px] rounded-t-[12px] bg-surface p-4">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-base font-semibold">Choose location</h2>
              <button onClick={() => setOpen(false)} className="min-h-11 px-2 text-sm text-accent">Close</button>
            </div>

            <button
              onClick={detect}
              disabled={detecting}
              className="mb-3 flex min-h-11 w-full items-center justify-center rounded-[8px] bg-accent text-sm font-medium text-accent-fg disabled:opacity-60"
            >
              {detecting ? "Finding your location..." : "Use current location"}
            </button>
            {error && <p className="mb-3 text-sm text-danger">{error}</p>}

            <ul className="flex flex-col gap-2">
              {locations.map((loc) => (
                <li key={loc.id}>
                  <button
                    onClick={() => {
                      setSelected(loc.id);
                      setOpen(false);
                    }}
                    aria-pressed={selectedId === loc.id}
                    className={`flex min-h-11 w-full flex-col items-start rounded-[8px] border-[0.5px] p-3 text-left ${selectedId === loc.id ? "border-accent" : "border-border"}`}
                  >
                    <span className="text-sm font-medium">{loc.label}</span>
                    <span className="text-xs text-muted">{loc.address}</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </>
  );
}
