import { Suspense } from "react";
import { OrderStatus } from "@/features/orders/OrderStatus";

export default function Page({ params }: { params: Promise<{ id: string }> }) {
  return (
    <Suspense fallback={null}>
      <OrderStatusByParams params={params} />
    </Suspense>
  );
}

async function OrderStatusByParams({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <OrderStatus orderId={id} />;
}
