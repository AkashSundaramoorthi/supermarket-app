import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type { Fulfilment } from "@/lib/pricing/calculateCartTotal";

type PrefsState = {
  fulfilment: Fulfilment | null;
  setFulfilment: (fulfilment: Fulfilment) => void;
};

export const usePrefsStore = create<PrefsState>()(
  persist(
    (set) => ({
      fulfilment: null,
      setFulfilment: (fulfilment) => set({ fulfilment }),
    }),
    { name: "prefs-v1", storage: createJSONStorage(() => localStorage) },
  ),
);
