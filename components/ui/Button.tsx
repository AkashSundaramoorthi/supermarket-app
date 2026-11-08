import type { ButtonHTMLAttributes } from "react";

type Variant = "primary" | "secondary";

const variants: Record<Variant, string> = {
  primary: "bg-accent text-accent-fg",
  secondary: "border-[0.5px] border-border bg-surface text-fg",
};

export function Button({
  variant = "primary",
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  return (
    <button
      {...props}
      className={`flex min-h-11 items-center justify-center rounded-[8px] px-4 text-sm font-medium disabled:opacity-50 ${variants[variant]} ${className}`}
    />
  );
}
