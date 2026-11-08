import { Suspense } from "react";
import { ProductDetail } from "@/features/home/ProductDetail";

export default function Page({ params }: { params: Promise<{ id: string }> }) {
  return (
    <Suspense fallback={null}>
      <ProductDetailByParams params={params} />
    </Suspense>
  );
}

async function ProductDetailByParams({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <ProductDetail productId={id} />;
}
