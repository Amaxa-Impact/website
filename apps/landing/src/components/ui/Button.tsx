import type { ButtonHTMLAttributes, ReactNode } from "react";

type Variant = "fill" | "outline" | "ghost" | "inverse-fill" | "inverse-outline";

const base =
  "inline-flex items-center gap-2 rounded-full px-6 py-3 text-base font-medium transition-colors " +
  "disabled:pointer-events-none disabled:opacity-100";

const variants: Record<Variant, string> = {
  fill:
    "bg-coral-dark-500 text-white hover:bg-coral-dark-600 " +
    "disabled:bg-neutral-2-300 disabled:text-neutral-2-600",
  outline:
    "border border-purple-dark-500 text-purple-dark-500 hover:bg-purple-dark-500 hover:text-white " +
    "disabled:border-neutral-2-400 disabled:text-neutral-2-600 disabled:bg-transparent",
  ghost:
    "rounded-none px-0.5 py-1.5 text-purple-dark-500 hover:text-purple-dark-700 " +
    "disabled:text-neutral-2-600",
  "inverse-fill":
    "bg-white text-purple-dark-500 hover:bg-neutral-2-200 hover:text-purple-dark-600 " +
    "disabled:bg-neutral-2-300 disabled:text-neutral-2-600",
  "inverse-outline":
    "border border-white text-white hover:bg-white hover:text-purple-dark-500",
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  /** show the trailing arrow (Figma "Icon" boolean prop) */
  icon?: boolean;
  children: ReactNode;
}

export function Button({
  variant = "fill",
  icon = true,
  children,
  className = "",
  ...props
}: ButtonProps) {
  return (
    <button className={`${base} ${variants[variant]} ${className}`} {...props}>
      {children}
      {icon && <span aria-hidden>→</span>}
    </button>
  );
}
