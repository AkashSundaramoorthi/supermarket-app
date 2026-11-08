"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { DEMO_OTP, useAuthStore } from "./authStore";

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const login = useAuthStore((s) => s.login);
  const [phone, setPhone] = useState("");
  const [codeSent, setCodeSent] = useState(false);
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);

  const next = searchParams.get("next");
  const redirectTarget = next && next.startsWith("/") ? next : "/";

  const [loading, setLoading] = useState(false);

  const quickLogin = (demoPhone = "9876543210") => {
    login(demoPhone);
    router.push(redirectTarget);
  };

  const sendCode = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanPhone = phone.replace(/\s+/g, "");
    if (!/^\d{10}$/.test(cleanPhone)) {
      setError("Please enter a valid 10-digit mobile number");
      return;
    }
    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/auth/otp/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: cleanPhone }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to send code");
        setLoading(false);
        return;
      }
      setCodeSent(true);
    } catch {
      setError("Network error sending code");
    } finally {
      setLoading(false);
    }
  };

  const verify = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanPhone = phone.replace(/\s+/g, "");
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/auth/otp/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: cleanPhone, code: code.trim() }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || `Incorrect code. For demo, use ${DEMO_OTP}`);
        setLoading(false);
        return;
      }

      login(cleanPhone);
      router.push(redirectTarget);
    } catch {
      setError("Network error verifying code");
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-5 p-5">
      <div className="flex flex-col gap-1.5">
        <div className="flex size-12 items-center justify-center rounded-2xl bg-accent text-2xl shadow-xs">
          📱
        </div>
        <h1 className="text-xl font-bold tracking-tight text-fg">Log in or Sign up</h1>
        <p className="text-xs text-muted">
          Access your orders, saved hostel address, and express checkout.
        </p>
      </div>

      {/* 1-Tap Demo Login Button */}
      <div className="flex flex-col gap-2 rounded-[14px] bg-accent/10 p-4 border border-accent/20">
        <p className="text-xs font-bold text-accent">⚡ Instant Demo Access</p>
        <p className="text-[11px] text-muted">
          Skip SMS verification and sign in instantly as a campus student.
        </p>
        <button
          type="button"
          onClick={() => quickLogin("9876543210")}
          className="mt-1 flex min-h-11 w-full items-center justify-center rounded-[8px] bg-accent text-xs font-bold text-accent-fg shadow-xs transition-transform active:scale-[0.98]"
        >
          Sign in as Student (+91 98765 43210)
        </button>
      </div>

      <div className="relative flex items-center justify-center">
        <div className="w-full border-t border-border" />
        <span className="absolute bg-bg px-3 text-[11px] uppercase tracking-wider text-muted">
          Or with mobile number
        </span>
      </div>

      <form onSubmit={codeSent ? verify : sendCode} className="flex flex-col gap-3">
        <label className="flex flex-col gap-1.5 text-xs font-semibold">
          Mobile Number
          <div className="flex">
            <span className="flex min-h-11 items-center rounded-l-[8px] border border-r-0 border-border bg-neutral-100 px-3 text-xs text-muted dark:bg-neutral-800">
              +91
            </span>
            <input
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              value={phone}
              disabled={codeSent}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="9876543210"
              maxLength={10}
              className="min-h-11 flex-1 rounded-r-[8px] border border-border bg-surface px-3 text-sm focus:border-accent focus:outline-none disabled:opacity-60"
            />
          </div>
        </label>

        {codeSent && (
          <div className="flex flex-col gap-2">
            <label className="flex flex-col gap-1.5 text-xs font-semibold">
              Enter 6-digit Code
              <input
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="123456"
                className="min-h-11 rounded-[8px] border border-border bg-surface px-3 text-center text-lg font-bold tracking-widest focus:border-accent focus:outline-none"
              />
            </label>
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted">Demo code is {DEMO_OTP}</span>
              <button
                type="button"
                onClick={() => setCode(DEMO_OTP)}
                className="font-bold text-accent hover:underline"
              >
                Auto-fill {DEMO_OTP}
              </button>
            </div>
          </div>
        )}

        {error && <p className="text-xs text-danger">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="flex min-h-11 w-full items-center justify-center rounded-[8px] bg-accent text-sm font-bold text-accent-fg shadow-xs transition-transform active:scale-[0.98] disabled:opacity-50"
        >
          {loading ? "Please wait..." : codeSent ? "Verify Code & Proceed" : "Send Verification Code"}
        </button>

        {codeSent && (
          <button
            type="button"
            onClick={() => {
              setCodeSent(false);
              setCode("");
              setError(null);
            }}
            className="text-center text-xs text-muted hover:text-fg"
          >
            Change mobile number
          </button>
        )}
      </form>

      <p className="text-center text-[11px] text-muted">
        By continuing, you agree to Campus Fresh Market terms and fair usage guidelines.
      </p>
    </div>
  );
}
