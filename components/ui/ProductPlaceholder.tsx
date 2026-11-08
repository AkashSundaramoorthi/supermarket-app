"use client";

import { useState } from "react";
import { initials } from "@/lib/format/initials";

type Props = {
  name: string;
  image?: string;
  badge?: string;
  isVeg?: boolean;
  className?: string;
  aspect?: "square" | "video";
};

export function ProductPlaceholder({
  name,
  image,
  badge,
  isVeg,
  className = "",
  aspect = "square",
}: Props) {
  const [error, setError] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const aspectClass = aspect === "square" ? "aspect-square" : "aspect-video";

  return (
    <div
      className={`relative flex ${aspectClass} w-full items-center justify-center overflow-hidden rounded-[10px] bg-neutral-100 dark:bg-neutral-800/80 ${className}`}
    >
      {image && !error ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={image}
          alt={name}
          loading="lazy"
          decoding="async"
          onLoad={() => setLoaded(true)}
          onError={() => setError(true)}
          className={`size-full object-cover transition-all duration-300 ${
            loaded ? "opacity-100 scale-100" : "opacity-0 scale-95"
          }`}
        />
      ) : (
        <div
          aria-hidden="true"
          className="flex size-full items-center justify-center text-xl font-bold tracking-wider text-muted/60 select-none"
        >
          {initials(name)}
        </div>
      )}

      {/* Top Badges */}
      <div className="absolute top-2 left-2 right-2 flex items-center justify-between pointer-events-none">
        {badge ? (
          <span className="rounded-full bg-accent/90 backdrop-blur-xs px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-accent-fg shadow-xs">
            {badge}
          </span>
        ) : <span />}

        {typeof isVeg === "boolean" && (
          <span
            title={isVeg ? "Vegetarian" : "Non-Vegetarian"}
            className="flex size-4 items-center justify-center rounded-xs border border-neutral-300 bg-white/90 p-0.5 shadow-xs dark:border-neutral-700 dark:bg-neutral-900/90"
          >
            <span
              className={`size-2 rounded-full ${
                isVeg ? "bg-emerald-600" : "bg-red-600"
              }`}
            />
          </span>
        )}
      </div>
    </div>
  );
}
