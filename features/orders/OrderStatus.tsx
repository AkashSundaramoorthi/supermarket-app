import Link from "next/link";
import { findPlaceholderOrder } from "@/lib/placeholder/orders";
import { formatPaise } from "@/lib/format/money";
import { PROGRESS_STEPS, STATUS_LABELS } from "./statusLabels";

export function OrderStatus({ orderId }: { orderId: string }) {
  const order = findPlaceholderOrder(orderId);
  if (!order) {
    return (
      <div className="flex flex-col gap-3 p-4">
        <p>Order not found.</p>
        <Link href="/orders" className="text-accent">Back to orders</Link>
      </div>
    );
  }

  const steps = PROGRESS_STEPS[order.fulfilment];
  const currentIndex = steps.indexOf(order.status);

  return (
    <div className="flex flex-col gap-4 p-4">
      <Link href="/orders" className="min-h-11 py-3 text-sm text-accent">Orders</Link>
      <h1 className="text-xl font-semibold">Order {order.id}</h1>
      <p className="text-sm text-muted">{STATUS_LABELS[order.status]} · {formatPaise(order.totalPaise)}</p>

      {order.collectionCode && (
        <div className="flex flex-col items-center gap-1 rounded-[12px] bg-accent p-6 text-accent-fg">
          <p className="text-sm">Collection code</p>
          <p className="text-4xl font-bold tracking-widest">{order.collectionCode}</p>
        </div>
      )}

      <ol className="flex flex-col gap-3" aria-label="Order progress">
        {steps.map((step, i) => {
          const done = currentIndex >= i;
          return (
            <li key={step} className="flex items-center gap-3">
              <span className={`size-3 rounded-full ${done ? "bg-accent" : "border-[0.5px] border-border"}`} aria-hidden="true" />
              <span className={`text-sm ${done ? "text-fg" : "text-muted"}`}>{STATUS_LABELS[step]}</span>
            </li>
          );
        })}
      </ol>
      <p className="text-xs text-muted">Live updates arrive through Supabase Realtime in the backend phase.</p>
    </div>
  );
}
