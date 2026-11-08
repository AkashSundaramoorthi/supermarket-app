import { OrderStatus } from "@/features/orders/OrderStatus";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <OrderStatus orderId={id} />;
}
