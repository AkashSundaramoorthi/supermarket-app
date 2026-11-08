"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

interface StoreSettingsState {
  deliveryEnabled: boolean;
  deliveryPausedReason: string;
  pickupEtaMinutes: number;
  deliveryEtaMinutes: number;
  deliveryFeePaise: number;
  minFreeDeliveryPaise: number;
  isLoading: boolean;
  lastFetched: number | null;
  fetchSettings: () => Promise<void>;
  setDeliveryStatus: (enabled: boolean, reason?: string, adminKey?: string) => Promise<boolean>;
}

export const useStoreSettings = create<StoreSettingsState>()(
  persist(
    (set, get) => ({
      deliveryEnabled: true,
      deliveryPausedReason: "",
      pickupEtaMinutes: 15,
      deliveryEtaMinutes: 15,
      deliveryFeePaise: 2500,
      minFreeDeliveryPaise: 19900,
      isLoading: false,
      lastFetched: null,

      fetchSettings: async () => {
        try {
          set({ isLoading: true });
          const res = await fetch("/api/store/settings");
          if (res.ok) {
            const data = await res.json();
            if (data.success && data.settings) {
              set({
                deliveryEnabled: Boolean(data.settings.deliveryEnabled),
                deliveryPausedReason: data.settings.deliveryPausedReason || "",
                pickupEtaMinutes: data.settings.pickupEtaMinutes ?? 15,
                deliveryEtaMinutes: data.settings.deliveryEtaMinutes ?? 15,
                deliveryFeePaise: data.settings.deliveryFeePaise ?? 2500,
                minFreeDeliveryPaise: data.settings.minFreeDeliveryPaise ?? 19900,
                lastFetched: Date.now(),
              });
            }
          }
        } catch (err) {
          console.warn("[useStoreSettings] Failed to fetch settings:", err);
        } finally {
          set({ isLoading: false });
        }
      },

      setDeliveryStatus: async (enabled: boolean, reason = "", adminKey = "") => {
        // Optimistic update
        const prev = get().deliveryEnabled;
        set({ deliveryEnabled: enabled, deliveryPausedReason: reason });

        try {
          const res = await fetch("/api/store/settings", {
            method: "PATCH",
            headers: {
              "Content-Type": "application/json",
              ...(adminKey ? { "x-admin-key": adminKey } : {}),
            },
            body: JSON.stringify({
              deliveryEnabled: enabled,
              reason,
              password: adminKey || "authorized_owner_session",
            }),
          });

          if (!res.ok) {
            // Revert on failure
            set({ deliveryEnabled: prev });
            return false;
          }

          const data = await res.json();
          if (data.success) {
            set({
              deliveryEnabled: Boolean(data.settings.deliveryEnabled),
              lastFetched: Date.now(),
            });
            return true;
          }
          set({ deliveryEnabled: prev });
          return false;
        } catch (err) {
          console.error("[useStoreSettings] Failed to update delivery status:", err);
          set({ deliveryEnabled: prev });
          return false;
        }
      },
    }),
    {
      name: "store-settings-v1",
      storage: createJSONStorage(() => localStorage),
    }
  )
);
