"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

interface AdminSecurityGateProps {
  children: React.ReactNode;
}

export function AdminSecurityGate({ children }: AdminSecurityGateProps) {
  const [isUnlocked, setIsUnlocked] = useState<boolean>(false);
  const [isChecking, setIsChecking] = useState<boolean>(true);
  const [password, setPassword] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [remainingAttempts, setRemainingAttempts] = useState<number | null>(null);
  const [isLockedOut, setIsLockedOut] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [showPassword, setShowPassword] = useState<boolean>(false);

  useEffect(() => {
    // Check if session token exists and is valid
    const session = typeof window !== "undefined" ? localStorage.getItem("qm_admin_session") : null;
    const expiry = typeof window !== "undefined" ? localStorage.getItem("qm_admin_expiry") : null;
    const valid = Boolean(session && expiry && Number(expiry) > Date.now());

    const timer = setTimeout(() => {
      setIsUnlocked(valid);
      setIsChecking(false);
    }, 0);

    return () => clearTimeout(timer);
  }, []);

  const handleUnlock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim()) return;

    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/admin/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: password.trim() }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (res.status === 429) {
          setIsLockedOut(true);
          setError(data.error || "Too many failed attempts. Firewall locked.");
        } else {
          setError(data.error || "Incorrect master password");
          if (data.remainingAttempts !== undefined) {
            setRemainingAttempts(data.remainingAttempts);
          }
        }
        return;
      }

      // Success
      const expiry = Date.now() + 12 * 60 * 60 * 1000; // 12 hours
      localStorage.setItem("qm_admin_session", data.token || "authorized");
      localStorage.setItem("qm_admin_expiry", String(expiry));
      setIsUnlocked(true);
      setPassword("");
    } catch {
      setError("Network error connecting to security gateway");
    } finally {
      setLoading(false);
    }
  };

  const handleLock = () => {
    localStorage.removeItem("qm_admin_session");
    localStorage.removeItem("qm_admin_expiry");
    setIsUnlocked(false);
    setPassword("");
    setError("");
  };

  if (isChecking) {
    return (
      <div className="flex min-h-[80vh] items-center justify-center p-6">
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="size-8 animate-spin rounded-full border-2 border-accent border-t-transparent" />
          <p className="text-xs font-semibold text-muted">Verifying Owner Security Credentials...</p>
        </div>
      </div>
    );
  }

  // If locked, display high-security Firewall Lock Screen
  if (!isUnlocked) {
    return (
      <div className="flex min-h-[calc(100dvh-5rem)] flex-col items-center justify-center p-4">
        <div className="w-full max-w-md rounded-2xl border border-border bg-surface p-6 shadow-xl dark:border-neutral-800">
          {/* Header Badge */}
          <div className="mb-6 flex flex-col items-center text-center">
            <div className="mb-3 flex size-14 items-center justify-center rounded-2xl bg-red-500/10 text-3xl text-red-600 dark:bg-red-500/20 dark:text-red-400">
              🛡️
            </div>
            <div className="flex items-center gap-1.5 rounded-full bg-red-500/10 px-3 py-1 text-xs font-bold text-red-700 dark:text-red-400">
              <span className="size-2 rounded-full bg-red-500 animate-pulse" />
              Security Firewall Active
            </div>
            <h1 className="mt-2 text-xl font-extrabold text-fg">
              Store Owner Verification Required
            </h1>
            <p className="mt-1 text-xs text-muted">
              This operational console is restricted to the supermarket owner. Please enter your secondary master password to proceed.
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleUnlock} className="flex flex-col gap-4">
            <div>
              <label htmlFor="admin-pwd" className="mb-1 block text-xs font-bold uppercase tracking-wider text-muted">
                Secondary Layer Password / PIN
              </label>
              <div className="relative">
                <input
                  id="admin-pwd"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter owner master password"
                  disabled={isLockedOut || loading}
                  autoFocus
                  className="w-full rounded-xl border border-border bg-bg px-4 py-3 text-sm font-medium tracking-wide text-fg placeholder:text-muted focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-muted hover:text-fg"
                >
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>
              <p className="mt-1.5 text-[11px] text-muted">
                Default Owner Master Password: <span className="font-mono font-semibold text-fg">freshmart2026</span>
              </p>
            </div>

            {error && (
              <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-semibold text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-400">
                ⚠️ {error}
                {remainingAttempts !== null && remainingAttempts > 0 && (
                  <div className="mt-1 font-normal">
                    {remainingAttempts} attempt{remainingAttempts > 1 ? "s" : ""} remaining before firewall lockout.
                  </div>
                )}
              </div>
            )}

            <button
              type="submit"
              disabled={isLockedOut || loading || !password.trim()}
              className="flex min-h-11 items-center justify-center rounded-xl bg-accent font-bold text-accent-fg shadow-md transition-all hover:opacity-90 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? "Authenticating..." : "🔓 Unlock Admin Console"}
            </button>
          </form>

          {/* Footer note */}
          <div className="mt-6 border-t border-border pt-4 text-center">
            <Link
              href="/"
              className="text-xs font-semibold text-muted transition-colors hover:text-fg"
            >
              ← Return to Supermarket Storefront
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Unlocked: Render owner console with persistent Security Status bar & Quick Lock
  return (
    <div>
      {/* Persistent Security Control Banner */}
      <div className="sticky top-0 z-40 border-b border-border bg-surface/95 px-4 py-2 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <span className="flex size-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="font-bold text-fg">Owner Console Authenticated</span>
            <span className="hidden rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 dark:text-emerald-400 sm:inline-block">
              Firewall Active · 2-Layer Security
            </span>
          </div>

          <button
            onClick={handleLock}
            className="flex items-center gap-1.5 rounded-lg border border-border bg-bg px-2.5 py-1 text-xs font-bold text-fg transition-all hover:border-red-500 hover:bg-red-50 hover:text-red-700 dark:hover:bg-red-950 dark:hover:text-red-400"
            title="Lock admin session immediately"
          >
            <span>🔒</span>
            <span>Lock Console</span>
          </button>
        </div>
      </div>

      {children}
    </div>
  );
}
