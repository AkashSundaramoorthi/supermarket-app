"use client";

import Link from "next/link";
import { formatPaise } from "@/lib/format/money";
import { findProduct } from "@/lib/placeholder/catalog";
import { QtyControl } from "@/features/cart/QtyControl";

export function ProductDetail({ productId }: { productId: string }) {
  const product = findProduct(productId);

  if (!product) {
    return (
      <div className="flex flex-col gap-3 p-4">
        <p>Product not found.</p>
        <Link href="/" className="text-accent">Back to home</Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 p-4">
      <Link href="/" className="min-h-11 py-3 text-sm text-accent">Back</Link>
      <div>
        <h1 className="text-xl font-semibold">{product.name}</h1>
        <p className="text-sm text-muted">{product.unit}</p>
      </div>
      <p className="text-sm">{product.description}</p>
      <div className="flex items-baseline gap-2">
        <span className="text-xl font-semibold">{formatPaise(product.unitPricePaise)}</span>
        <span className="text-sm text-muted line-through">{formatPaise(product.mrpPaise)}</span>
      </div>
      <QtyControl
        size="large"
        productId={product.id}
        name={product.name}
        unit={product.unit}
        unitPricePaise={product.unitPricePaise}
      />
    </div>
  );
}
