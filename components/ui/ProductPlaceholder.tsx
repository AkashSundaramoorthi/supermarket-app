import { initials } from "@/lib/format/initials";

export function ProductPlaceholder({ name, className = "" }: { name: string; className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={`flex aspect-square w-full items-center justify-center rounded-[8px] border-[0.5px] border-border bg-bg text-2xl font-semibold text-muted ${className}`}
    >
      {initials(name)}
    </div>
  );
}
