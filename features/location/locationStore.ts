import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

export const CURRENT_LOCATION_ID = "current";

export type SavedLocation = {
  id: string;
  name: string;
  address: string;
};

type LocationState = {
  savedLocations: SavedLocation[];
  selectedId: string | null;
  currentAddress: string | null;
  addLocation: (name: string, address: string) => SavedLocation;
  removeLocation: (id: string) => void;
  updateLocation: (id: string, name: string, address: string) => void;
  setSelected: (id: string) => void;
  setCurrent: (lat: number, lng: number) => void;
  setCustomAddress: (address: string, name?: string) => void;
};

export const useLocationStore = create<LocationState>()(
  persist(
    (set, get) => ({
      savedLocations: [],
      selectedId: null,
      currentAddress: null,

      addLocation: (name: string, address: string) => {
        const trimmedName = name.trim() || "Saved Location";
        const trimmedAddress = address.trim();
        const newLoc: SavedLocation = {
          id: `loc_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
          name: trimmedName,
          address: trimmedAddress,
        };
        set((state) => ({
          savedLocations: [newLoc, ...state.savedLocations],
          selectedId: newLoc.id,
        }));
        return newLoc;
      },

      removeLocation: (id: string) => {
        set((state) => {
          const filtered = state.savedLocations.filter((l) => l.id !== id);
          return {
            savedLocations: filtered,
            selectedId: state.selectedId === id ? (filtered[0]?.id ?? null) : state.selectedId,
          };
        });
      },

      updateLocation: (id: string, name: string, address: string) => {
        set((state) => ({
          savedLocations: state.savedLocations.map((l) =>
            l.id === id ? { ...l, name: name.trim(), address: address.trim() } : l,
          ),
        }));
      },

      setSelected: (id: string) => set({ selectedId: id }),

      setCurrent: (lat: number, lng: number) =>
        set({
          selectedId: CURRENT_LOCATION_ID,
          currentAddress: `GPS Location (${lat.toFixed(4)}, ${lng.toFixed(4)})`,
        }),

      setCustomAddress: (address: string, name?: string) => {
        const { savedLocations } = get();
        const trimmedAddress = address.trim();
        const trimmedName = name?.trim() || "Current Address";
        const existing = savedLocations.find(
          (l) => l.address.toLowerCase() === trimmedAddress.toLowerCase(),
        );
        if (existing) {
          set({ selectedId: existing.id });
        } else {
          const newLoc = get().addLocation(trimmedName, trimmedAddress);
          set({ selectedId: newLoc.id });
        }
      },
    }),
    { name: "location-custom-v2", storage: createJSONStorage(() => localStorage) },
  ),
);

export function describeLocation(
  selectedId: string | null,
  currentAddress: string | null,
  savedLocations: SavedLocation[] = [],
): { label: string; address: string } {
  if (selectedId === CURRENT_LOCATION_ID) {
    return { label: "Current GPS", address: currentAddress ?? "Detected via GPS" };
  }

  const found = savedLocations.find((l) => l.id === selectedId);
  if (found) {
    return { label: found.name, address: found.address };
  }

  if (savedLocations.length > 0) {
    return { label: savedLocations[0].name, address: savedLocations[0].address };
  }

  return { label: "Add Delivery Address", address: "Tap to set your delivery location" };
}
