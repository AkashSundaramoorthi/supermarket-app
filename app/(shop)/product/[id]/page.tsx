import { ProductDetail } from "@/features/home/ProductDetail";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <ProductDetail productId={id} />;
}
