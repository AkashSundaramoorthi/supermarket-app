"use client";

import Link from "next/link";
import { formatPaise } from "@/lib/format/money";
import { findProduct, products } from "@/lib/placeholder/catalog";
import { ProductPlaceholder } from "@/components/ui/ProductPlaceholder";
import { QtyControl } from "@/features/cart/QtyControl";

export function ProductDetail({ productId }: { productId: string }) {
  const product = findProduct(productId);

  if (!product) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 p-8 text-center">
        <span className="text-4xl">📦</span>
        <h1 className="text-lg font-bold">Product not found</h1>
        <p className="text-sm text-muted">The product you are looking for might have been moved.</p>
        <Link
          href="/"
          className="mt-2 rounded-[8px] bg-accent px-4 py-2 text-sm font-semibold text-accent-fg"
        >
          Back to Groceries
        </Link>
      </div>
    );
  }

  const savingsPaise = Math.max(0, product.mrpPaise - product.unitPricePaise);
  const discountPercent = Math.round((savingsPaise / product.mrpPaise) * 100);

  const related = products
    .filter((p) => p.categoryId === product.categoryId && p.id !== product.id)
    .slice(0, 4);

  return (
    <div className="flex flex-col gap-5 p-4 pb-12">
      {/* Top back navigation */}
      <div className="flex items-center justify-between">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted hover:text-fg"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 20 20"
            fill="currentColor"
            className="size-4"
          >
            <path
              fillRule="evenodd"
              d="M17 10a.75.75 0 0 1-.75.75H5.612l4.158 3.96a.75.75 0 1 1-1.04 1.08l-5.5-5.25a.75.75 0 0 1 0-1.08l5.5-5.25a.75.75 0 1 1 1.04 1.08L5.612 9.25H16.25A.75.75 0 0 1 17 10Z"
              clipRule="evenodd"
            />
          </svg>
          <span>Back to products</span>
        </Link>
        <span className="text-xs text-muted">SKU: {product.id}</span>
      </div>

      {/* Main hero image */}
      <div className="overflow-hidden rounded-[16px] border border-border bg-surface p-2 shadow-xs">
        <ProductPlaceholder
          name={product.name}
          image={product.image}
          badge={product.badge}
          isVeg={product.isVeg}
          aspect="square"
          className="rounded-[12px]"
        />
      </div>

      {/* Product Info */}
      <div className="flex flex-col gap-2 rounded-[16px] border border-border bg-surface p-4 shadow-xs">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-muted">{product.unit}</span>
          {product.calories && (
            <span className="text-xs font-medium text-muted">🔥 {product.calories}</span>
          )}
        </div>

        <h1 className="text-xl font-bold tracking-tight text-fg">{product.name}</h1>

        <div className="mt-1 flex items-baseline gap-2.5">
          <span className="text-2xl font-extrabold text-fg">
            {formatPaise(product.unitPricePaise)}
          </span>
          {savingsPaise > 0 && (
            <>
              <span className="text-sm text-muted line-through">
                {formatPaise(product.mrpPaise)}
              </span>
              <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-xs font-bold text-emerald-700 dark:text-emerald-400">
                {discountPercent}% OFF · Save {formatPaise(savingsPaise)}
              </span>
            </>
          )}
        </div>

        <div className="mt-3">
          <QtyControl
            size="large"
            productId={product.id}
            name={product.name}
            unit={product.unit}
            unitPricePaise={product.unitPricePaise}
            image={product.image}
            mrpPaise={product.mrpPaise}
          />
        </div>
      </div>

      {/* Product Description */}
      <div className="flex flex-col gap-2 rounded-[16px] border border-border bg-surface p-4 shadow-xs">
        <h2 className="text-sm font-bold text-fg">Product Overview</h2>
        <p className="text-sm leading-relaxed text-muted">{product.description}</p>

        <div className="mt-2 grid grid-cols-3 gap-2 border-t border-border pt-3 text-center">
          <div className="flex flex-col items-center gap-1">
            <span className="text-lg">⚡</span>
            <span className="text-[11px] font-semibold">12m Delivery</span>
          </div>
          <div className="flex flex-col items-center gap-1">
            <span className="text-lg">🌿</span>
            <span className="text-[11px] font-semibold">100% Quality</span>
          </div>
          <div className="flex flex-col items-center gap-1">
            <span className="text-lg">🔄</span>
            <span className="text-[11px] font-semibold">Easy Returns</span>
          </div>
        </div>
      </div>

      {/* Related Products */}
      {related.length > 0 && (
        <div className="flex flex-col gap-3">
          <h2 className="text-base font-bold text-fg">You might also like</h2>
          <div className="grid grid-cols-2 gap-3">
            {related.map((p) => (
              <div
                key={p.id}
                className="flex flex-col justify-between rounded-[12px] border border-border bg-surface p-2.5 shadow-2xs"
              >
                <Link href={`/product/${p.id}`} className="flex flex-col gap-1">
                  <ProductPlaceholder
                    name={p.name}
                    image={p.image}
                    badge={p.badge}
                    isVeg={p.isVeg}
                  />
                  <p className="text-[11px] text-muted">{p.unit}</p>
                  <p className="line-clamp-1 text-xs font-semibold">{p.name}</p>
                  <p className="text-xs font-bold text-fg">{formatPaise(p.unitPricePaise)}</p>
                </Link>
                <div className="mt-2">
                  <QtyControl
                    productId={p.id}
                    name={p.name}
                    unit={p.unit}
                    unitPricePaise={p.unitPricePaise}
                    image={p.image}
                    mrpPaise={p.mrpPaise}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
