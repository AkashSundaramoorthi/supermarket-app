"use client";

import { useState, useEffect } from "react";

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
  prompt(): Promise<void>;
}

export function InstallPromptBanner() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isStandalone, setIsStandalone] = useState(true); // default true to avoid flash
  const [isIos, setIsIos] = useState(false);
  const [showIosGuide, setShowIosGuide] = useState(false);
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      // 1. Check if already installed & running in standalone mode
      const standaloneMode =
        window.matchMedia("(display-mode: standalone)").matches ||
        (window.navigator as unknown as { standalone?: boolean }).standalone === true;

      setIsStandalone(standaloneMode);
      if (standaloneMode) return;

      // 2. Check if recently dismissed by user (within 7 days)
      const lastDismissed = localStorage.getItem("qm_install_dismissed");
      if (lastDismissed && Date.now() - Number(lastDismissed) < 7 * 24 * 60 * 60 * 1000) {
        setDismissed(true);
        return;
      }
      setDismissed(false);

      // 3. Register service worker for official PWA installability
      if ("serviceWorker" in navigator && process.env.NODE_ENV === "production") {
        navigator.serviceWorker
          .register("/sw.js")
          .catch((err) => console.warn("[SW] Registration skipped:", err));
      }

      // 4. Detect iOS devices
      const userAgent = window.navigator.userAgent.toLowerCase();
      const isIosDevice = /iphone|ipad|ipod/.test(userAgent);
      setIsIos(isIosDevice);
    }, 0);

    // 5. Capture native Android / Chrome / Edge install prompt
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setDismissed(false);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstall);

    return () => {
      clearTimeout(timer);
      window.removeEventListener("beforeinstallprompt", handleBeforeInstall);
    };
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      await deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      if (choice.outcome === "accepted") {
        setIsStandalone(true);
      }
      setDeferredPrompt(null);
    } else if (isIos) {
      setShowIosGuide(true);
    }
  };

  const handleDismiss = () => {
    setDismissed(true);
    localStorage.setItem("qm_install_dismissed", String(Date.now()));
  };

  // Do not show if already running in standalone app or dismissed
  if (isStandalone || dismissed) {
    return null;
  }

  // Only show if either deferredPrompt is ready (Android/Chrome) or it's an iOS Safari user
  if (!deferredPrompt && !isIos) {
    return null;
  }

  return (
    <>
      {/* Floating Bottom App Installation Banner */}
      <div className="fixed bottom-16 left-0 right-0 z-40 px-3 py-2 sm:bottom-4 pointer-events-none">
        <div className="pointer-events-auto mx-auto flex max-w-md items-center justify-between gap-3 rounded-2xl border border-emerald-500/30 bg-neutral-900/95 p-3.5 text-white shadow-2xl backdrop-blur-md dark:border-neutral-700">
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-emerald-600 text-xl font-bold shadow-xs">
              🛒
            </div>
            <div className="min-w-0">
              <p className="truncate text-xs font-extrabold text-white">
                Install QuickMart App
              </p>
              <p className="truncate text-[11px] text-neutral-300">
                1-tap home screen access & live GPS tracking
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={handleInstallClick}
              className="rounded-xl bg-emerald-500 px-3.5 py-1.5 text-xs font-bold text-neutral-950 shadow-md transition-transform hover:bg-emerald-400 active:scale-95"
            >
              Install
            </button>
            <button
              onClick={handleDismiss}
              aria-label="Dismiss install banner"
              className="flex size-7 items-center justify-center rounded-lg text-neutral-400 hover:bg-neutral-800 hover:text-white"
            >
              ✕
            </button>
          </div>
        </div>
      </div>

      {/* iOS Safari Step-by-Step Installation Modal */}
      {showIosGuide && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-sm rounded-3xl border border-neutral-200 bg-white p-6 shadow-2xl dark:border-neutral-800 dark:bg-neutral-900">
            <div className="flex items-start justify-between">
              <div className="flex size-12 items-center justify-center rounded-2xl bg-emerald-600 text-2xl text-white">
                📲
              </div>
              <button
                onClick={() => setShowIosGuide(false)}
                className="flex size-8 items-center justify-center rounded-full bg-neutral-100 text-xs font-bold text-neutral-600 hover:bg-neutral-200 dark:bg-neutral-800 dark:text-neutral-300"
              >
                ✕
              </button>
            </div>

            <h3 className="mt-4 text-base font-extrabold text-neutral-900 dark:text-neutral-100">
              Install QuickMart on iPhone
            </h3>
            <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
              Follow these 2 quick steps to add QuickMart to your Home Screen:
            </p>

            <div className="mt-4 flex flex-col gap-3 rounded-2xl bg-neutral-50 p-4 text-xs dark:bg-neutral-800/50">
              <div className="flex items-start gap-3">
                <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-emerald-600 font-bold text-white text-[11px]">
                  1
                </span>
                <p className="text-neutral-700 dark:text-neutral-200">
                  Tap the <strong className="font-bold text-neutral-900 dark:text-white">Share button</strong> (
                  <span className="inline-block text-base leading-none">⎋</span> or square with an upward arrow) at the bottom of Safari.
                </p>
              </div>

              <div className="flex items-start gap-3">
                <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-emerald-600 font-bold text-white text-[11px]">
                  2
                </span>
                <p className="text-neutral-700 dark:text-neutral-200">
                  Scroll down and tap <strong className="font-bold text-neutral-900 dark:text-white">&quot;Add to Home Screen&quot; ➕</strong>.
                </p>
              </div>
            </div>

            <button
              onClick={() => setShowIosGuide(false)}
              className="mt-5 w-full rounded-xl bg-emerald-600 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-emerald-700"
            >
              Got it!
            </button>
          </div>
        </div>
      )}
    </>
  );
}
