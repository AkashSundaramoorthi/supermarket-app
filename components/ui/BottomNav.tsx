"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const items = [
  { href: "/", label: "Home" },
  { href: "/orders", label: "Orders" },
  { href: "/profile", label: "Profile" },
];

export function BottomNav() {
  const pathname = usePathname();
  return (
    <nav aria-label="Main" className="grid grid-cols-3 border-t-[0.5px] border-border bg-surface">
      {items.map((item) => {
        const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={`flex min-h-14 items-center justify-center text-sm font-medium ${active ? "text-accent" : "text-muted"}`}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
