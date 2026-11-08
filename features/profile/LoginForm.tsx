"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { DEMO_OTP, useAuthStore } from "./authStore";

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const login = useAuthStore((s) => s.login);
  const [phone, setPhone] = useState("");
  const [codeSent, setCodeSent] = useState(false);
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);

  const sendCode = (e: React.FormEvent) => {
    e.preventDefault();
    if (!/^\d{10}$/.test(phone.replace(/\s/g, ""))) {
      setError("Enter a 10-digit mobile number");
      return;
    }
    setError(null);
    setCodeSent(true);
  };

  const verify = (e: React.FormEvent) => {
    e.preventDefault();
    if (code !== DEMO_OTP) {
      setError(`Wrong code. For this demo use ${DEMO_OTP}`);
      return;
    }
    login(phone.replace(/\s/g, ""));
    const next = searchParams.get("next");
    router.push(next && next.startsWith("/") ? next : "/");
  };

  return (
    <form onSubmit={codeSent ? verify : sendCode} className="flex flex-col gap-4 p-4">
      <h1 className="text-xl font-semibold">Log in</h1>
      <label className="flex flex-col gap-1 text-sm">
        Mobile number
        <input
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          value={phone}
          disabled={codeSent}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="9876543210"
          className="min-h-11 rounded-[8px] border-[0.5px] border-border bg-surface px-3 disabled:opacity-60"
        />
      </label>
      {codeSent && (
        <label className="flex flex-col gap-1 text-sm">
          Code
          <input
            inputMode="numeric"
            autoComplete="one-time-code"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            className="min-h-11 rounded-[8px] border-[0.5px] border-border bg-surface px-3"
          />
        </label>
      )}
      {error && <p className="text-sm text-danger">{error}</p>}
      <Button type="submit">{codeSent ? "Verify and log in" : "Send code"}</Button>
      <p className="text-xs text-muted">
        Demo login: no SMS is sent. Enter any 10-digit number, then use code {DEMO_OTP}. Real OTP comes with the backend phase.
      </p>
    </form>
  );
}
