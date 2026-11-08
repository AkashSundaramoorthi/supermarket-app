import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { CURRENT_LOCATION_ID, locations, type Location } from "@/lib/placeholder/locations";

type LocationState = {
  selectedId: string;
  currentAddress: string | null;
  setSelected: (id: string) => void;
  setCurrent: (lat: number, lng: number) => void;
};

export const useLocationStore = create<LocationState>()(
  persist(
    (set) => ({
      selectedId: locations[0].id,
      currentAddress: null,
      setSelected: (id) => set({ selectedId: id }),
      setCurrent: (lat, lng) =>
        set({
          selectedId: CURRENT_LOCATION_ID,
          currentAddress: `Current location (${lat.toFixed(4)}, ${lng.toFixed(4)})`,
        }),
    }),
    { name: "location-v1", storage: createJSONStorage(() => localStorage) },
  ),
);

export function describeLocation(
  selectedId: string,
  currentAddress: string | null,
): { label: string; address: string } {
  if (selectedId === CURRENT_LOCATION_ID) {
    return { label: "Current location", address: currentAddress ?? "Current location" };
  }
  const found: Location | undefined = locations.find((l) => l.id === selectedId) ?? locations[0];
  return { label: found.label, address: found.address };
}
