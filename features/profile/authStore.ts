import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

export const DEMO_OTP = "1234";

type AuthState = {
  phone: string | null;
  name: string;
  login: (phone: string) => void;
  setName: (name: string) => void;
  logout: () => void;
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      phone: null,
      name: "",
      login: (phone) => set({ phone }),
      setName: (name) => set({ name: name.trim().slice(0, 60) }),
      logout: () => set({ phone: null, name: "" }),
    }),
    { name: "auth-v1", storage: createJSONStorage(() => localStorage) },
  ),
);
