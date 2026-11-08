import { Suspense } from "react";
import { BottomNav } from "@/components/ui/BottomNav";
import { CartBar } from "@/features/cart/CartBar";

export default function ShopLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-[430px] flex-col bg-bg md:my-6 md:min-h-[calc(100dvh-3rem)] md:overflow-hidden md:rounded-[12px] md:border-[0.5px] md:border-border">
      <main className="flex-1 pb-44">
        <Suspense fallback={null}>{children}</Suspense>
      </main>
      <div className="fixed bottom-0 left-1/2 z-20 w-full max-w-[430px] -translate-x-1/2">
        <Suspense fallback={null}>
          <CartBar />
          <BottomNav />
        </Suspense>
      </div>
    </div>
  );
}
