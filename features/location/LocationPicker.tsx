"use client";

import { useState } from "react";
import { useHydrated } from "@/lib/hooks/useHydrated";
import { store } from "@/lib/placeholder/catalog";
import { CURRENT_LOCATION_ID, describeLocation, useLocationStore } from "./locationStore";

export function LocationPicker() {
  const hydrated = useHydrated();
  const selectedId = useLocationStore((s) => s.selectedId);
  const currentAddress = useLocationStore((s) => s.currentAddress);
  const savedLocations = useLocationStore((s) => s.savedLocations);
  const setSelected = useLocationStore((s) => s.setSelected);
  const setCurrent = useLocationStore((s) => s.setCurrent);
  const addLocation = useLocationStore((s) => s.addLocation);
  const removeLocation = useLocationStore((s) => s.removeLocation);

  const [open, setOpen] = useState(false);
  const [detecting, setDetecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // New location form state
  const [showAddForm, setShowAddForm] = useState(false);
  const [newName, setNewName] = useState("");
  const [newAddress, setNewAddress] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  const current = hydrated
    ? describeLocation(selectedId, currentAddress, savedLocations)
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
        setError("Could not get device GPS. Please enter your delivery address below.");
      },
      { enableHighAccuracy: false, timeout: 8000 },
    );
  };

  const handleSaveNewLocation = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) {
      setFormError("Please enter a name for this location (e.g. Home, Office, Flat 4).");
      return;
    }
    if (!newAddress.trim() || newAddress.trim().length < 5) {
      setFormError("Please enter a valid street address (at least 5 characters).");
      return;
    }

    addLocation(newName, newAddress);
    setNewName("");
    setNewAddress("");
    setFormError(null);
    setShowAddForm(false);
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
          <div className="w-full max-w-[430px] max-h-[85vh] flex flex-col rounded-t-[20px] border-t border-border bg-surface p-5 shadow-2xl animate-in slide-in-from-bottom duration-200">
            {/* Modal Drag handle */}
            <div className="mx-auto mb-3 h-1 w-10 shrink-0 rounded-full bg-border" />

            <div className="mb-4 flex items-center justify-between shrink-0">
              <div>
                <h2 className="text-base font-bold">Select Delivery Location</h2>
                <p className="text-xs text-muted">
                  Choose your saved address, add a custom one, or use GPS
                </p>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="flex size-8 items-center justify-center rounded-full bg-neutral-100 text-muted transition-colors hover:text-fg dark:bg-neutral-800"
              >
                ✕
              </button>
            </div>

            <div className="overflow-y-auto pr-1 flex flex-col gap-3">
              {/* GPS Button */}
              <button
                onClick={detect}
                disabled={detecting}
                className="flex min-h-11 w-full items-center justify-center gap-2 rounded-[10px] bg-accent/10 border border-accent/20 text-xs font-semibold text-accent transition-transform active:scale-[0.98] disabled:opacity-60"
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
                <p className="rounded-[8px] bg-red-500/10 p-2.5 text-xs text-danger">
                  {error}
                </p>
              )}

              {/* Add Custom Location Toggle / Form */}
              {!showAddForm ? (
                <button
                  onClick={() => setShowAddForm(true)}
                  className="flex min-h-11 w-full items-center justify-center gap-1.5 rounded-[10px] border border-dashed border-accent/60 bg-accent/5 text-xs font-semibold text-accent hover:bg-accent/10 active:scale-[0.99]"
                >
                  <span>+</span>
                  <span>Add New Saved Location</span>
                </button>
              ) : (
                <form
                  onSubmit={handleSaveNewLocation}
                  className="flex flex-col gap-2.5 rounded-[12px] border border-accent/30 bg-accent/5 p-3.5"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-accent">New Location Details</span>
                    <button
                      type="button"
                      onClick={() => {
                        setShowAddForm(false);
                        setFormError(null);
                      }}
                      className="text-[11px] text-muted hover:text-fg"
                    >
                      Cancel
                    </button>
                  </div>

                  <input
                    type="text"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="Location Name (e.g. Home, Work, Apartment 4B)"
                    maxLength={40}
                    className="min-h-9 rounded-[8px] border border-border bg-surface px-3 text-xs focus:border-accent focus:outline-none"
                  />

                  <textarea
                    value={newAddress}
                    onChange={(e) => setNewAddress(e.target.value)}
                    placeholder="Full delivery address, street, house number, landmark..."
                    rows={2}
                    maxLength={150}
                    className="rounded-[8px] border border-border bg-surface p-2 text-xs focus:border-accent focus:outline-none"
                  />

                  {formError && (
                    <p className="text-[11px] text-danger">{formError}</p>
                  )}

                  <button
                    type="submit"
                    className="min-h-9 rounded-[8px] bg-accent font-semibold text-xs text-accent-fg shadow-2xs hover:opacity-95 active:scale-[0.98]"
                  >
                    Save & Select Location
                  </button>
                </form>
              )}

              {/* Saved Locations List */}
              <div className="mt-1 flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-muted">
                  Saved Locations ({savedLocations.length})
                </span>
              </div>

              {savedLocations.length === 0 ? (
                <div className="flex flex-col items-center justify-center rounded-[12px] border border-dashed border-border p-5 text-center text-xs text-muted">
                  <span className="text-2xl mb-1">📍</span>
                  <p className="font-semibold text-fg">No custom locations saved yet</p>
                  <p className="text-[11px] mt-0.5">
                    Save your home, apartment, office, or neighborhood address with any name you like.
                  </p>
                </div>
              ) : (
                <ul className="flex flex-col gap-2">
                  {savedLocations.map((loc) => {
                    const isSelected = selectedId === loc.id;
                    return (
                      <li key={loc.id} className="relative group">
                        <div
                          className={`flex w-full items-center justify-between rounded-[10px] border p-3 transition-all ${
                            isSelected
                              ? "border-accent bg-accent/5 dark:bg-accent/10"
                              : "border-border hover:bg-neutral-50 dark:hover:bg-neutral-800/50"
                          }`}
                        >
                          <button
                            type="button"
                            onClick={() => {
                              setSelected(loc.id);
                              setOpen(false);
                            }}
                            className="flex flex-1 items-center gap-3 text-left min-w-0"
                          >
                            <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-neutral-100 text-sm dark:bg-neutral-800">
                              🏠
                            </span>
                            <div className="min-w-0 pr-2">
                              <p className={`text-sm truncate ${isSelected ? "font-bold text-accent" : "font-semibold"}`}>
                                {loc.name}
                              </p>
                              <p className="text-xs text-muted truncate">{loc.address}</p>
                            </div>
                          </button>

                          <div className="flex items-center gap-1.5 shrink-0">
                            {isSelected && (
                              <span className="flex size-5 items-center justify-center rounded-full bg-accent text-[11px] text-accent-fg">
                                ✓
                              </span>
                            )}
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                removeLocation(loc.id);
                              }}
                              className="flex size-7 items-center justify-center rounded-full text-muted transition-colors hover:bg-red-500/10 hover:text-danger"
                              title="Delete location"
                            >
                              🗑️
                            </button>
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}

              {/* Show GPS Option if selected */}
              {selectedId === CURRENT_LOCATION_ID && (
                <div className="flex items-center justify-between rounded-[10px] border border-accent bg-accent/5 p-3 text-xs">
                  <div className="flex items-center gap-2">
                    <span>📡</span>
                    <span className="font-semibold text-accent">{currentAddress}</span>
                  </div>
                  <span className="font-bold text-accent">Active GPS</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
