import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

export const DEMO_OTP = "1234";

type AuthState = {
  phone: string | null;
  login: (phone: string) => void;
  logout: () => void;
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      phone: null,
      login: (phone) => set({ phone }),
      logout: () => set({ phone: null }),
    }),
    { name: "auth-v1", storage: createJSONStorage(() => localStorage) },
  ),
);
