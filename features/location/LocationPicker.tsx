"use client";

import { useState } from "react";
import { useHydrated } from "@/lib/hooks/useHydrated";
import { locations } from "@/lib/placeholder/locations";
import { store } from "@/lib/placeholder/catalog";
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

  const current = hydrated
    ? describeLocation(selectedId, currentAddress)
    : { label: "Select Location", address: "Select delivery spot" };

  const detect = () => {
    if (!navigator.geolocation) {
      setError("Location is not supported on this browser.");
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
        setError("Could not get your location. Please select one of the delivery addresses below.");
      },
      { enableHighAccuracy: false, timeout: 8000 },
    );
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="group flex w-full items-center justify-between rounded-[12px] border-[0.5px] border-border bg-surface p-3 text-left shadow-2xs transition-all hover:border-accent/40 active:scale-[0.99]"
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-accent/10 text-accent">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
              fill="currentColor"
              className="size-5"
            >
              <path
                fillRule="evenodd"
                d="m9.69 18.933.003.001C9.89 19.02 10 19 10 19s.11.02.308-.066l.002-.001.006-.003.018-.008a5.741 5.741 0 0 0 .281-.14c.186-.096.446-.24.757-.433.62-.384 1.445-.966 2.274-1.765C15.302 14.988 17 12.493 17 9A7 7 0 1 0 3 9c0 3.492 1.698 5.988 3.355 7.588a13.435 13.435 0 0 0 3.031 2.198l.018.008.006.003.002.001Zm.31-7.933a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z"
                clipRule="evenodd"
              />
            </svg>
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-muted">
                Delivering to
              </span>
              <span className="inline-flex items-center gap-0.5 rounded-full bg-emerald-500/10 px-1.5 py-0.2 text-[10px] font-bold text-emerald-700 dark:text-emerald-400">
                ⚡ {store.deliveryEtaMinutes} MINS
              </span>
            </div>
            <p className="truncate text-sm font-semibold text-fg">
              {current.label}
              <span className="ml-1.5 font-normal text-xs text-muted truncate">
                · {current.address}
              </span>
            </p>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-1 text-xs font-semibold text-accent group-hover:underline">
          <span>Change</span>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 20 20"
            fill="currentColor"
            className="size-4"
          >
            <path
              fillRule="evenodd"
              d="M5.22 8.22a.75.75 0 0 1 1.06 0L10 11.94l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L5.22 9.28a.75.75 0 0 1 0-1.06Z"
              clipRule="evenodd"
            />
          </svg>
        </div>
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-xs transition-opacity animate-in fade-in"
          role="dialog"
          aria-modal="true"
          aria-label="Choose delivery location"
        >
          <div
            className="w-full max-w-[430px] rounded-t-[20px] border-t border-border bg-surface p-5 shadow-2xl animate-in slide-in-from-bottom duration-200"
          >
            {/* Modal Drag handle */}
            <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-border" />

            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold">Select Delivery Location</h2>
                <p className="text-xs text-muted">
                  Choose your hostel, department, or live GPS spot
                </p>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="flex size-8 items-center justify-center rounded-full bg-neutral-100 text-muted transition-colors hover:text-fg dark:bg-neutral-800"
              >
                ✕
              </button>
            </div>

            <button
              onClick={detect}
              disabled={detecting}
              className="mb-4 flex min-h-12 w-full items-center justify-center gap-2 rounded-[10px] bg-accent text-sm font-semibold text-accent-fg shadow-xs transition-transform active:scale-[0.98] disabled:opacity-60"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 20 20"
                fill="currentColor"
                className="size-4"
              >
                <path
                  fillRule="evenodd"
                  d="m9.69 18.933.003.001C9.89 19.02 10 19 10 19s.11.02.308-.066l.002-.001.006-.003.018-.008a5.741 5.741 0 0 0 .281-.14c.186-.096.446-.24.757-.433.62-.384 1.445-.966 2.274-1.765C15.302 14.988 17 12.493 17 9A7 7 0 1 0 3 9c0 3.492 1.698 5.988 3.355 7.588a13.435 13.435 0 0 0 3.031 2.198l.018.008.006.003.002.001Zm.31-7.933a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z"
                  clipRule="evenodd"
                />
              </svg>
              <span>{detecting ? "Locating device GPS..." : "Use Current GPS Location"}</span>
            </button>

            {error && (
              <p className="mb-3 rounded-[8px] bg-red-500/10 p-2.5 text-xs text-danger">
                {error}
              </p>
            )}

            <div className="mb-2 text-xs font-bold uppercase tracking-wider text-muted">
              Saved Delivery Addresses
            </div>

            <ul className="flex flex-col gap-2 max-h-[50vh] overflow-y-auto pr-1">
              {locations.map((loc) => {
                const isSelected = selectedId === loc.id;
                return (
                  <li key={loc.id}>
                    <button
                      onClick={() => {
                        setSelected(loc.id);
                        setOpen(false);
                      }}
                      className={`flex w-full items-center justify-between rounded-[10px] border p-3 text-left transition-all ${
                        isSelected
                          ? "border-accent bg-accent/5 dark:bg-accent/10"
                          : "border-border hover:bg-neutral-50 dark:hover:bg-neutral-800/50"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-neutral-100 text-sm dark:bg-neutral-800">
                          📍
                        </span>
                        <div>
                          <p className={`text-sm ${isSelected ? "font-bold text-accent" : "font-medium"}`}>
                            {loc.label}
                          </p>
                          <p className="text-xs text-muted">{loc.address}</p>
                        </div>
                      </div>
                      {isSelected && (
                        <span className="flex size-5 items-center justify-center rounded-full bg-accent text-[11px] text-accent-fg">
                          ✓
                        </span>
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      )}
    </>
  );
}
