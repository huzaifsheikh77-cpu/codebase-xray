"use client";

import type { ButtonHTMLAttributes } from "react";

interface ActionButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "ghost";
  type?: "button" | "submit" | "reset";
  children: React.ReactNode;
}

/** Main action button — acid fill, ink text, hard shadow press effect. */
export function ActionButton({ variant = "primary", type = "button", className, children, ...props }: ActionButtonProps) {
  const base =
    "inline-flex select-none items-center justify-center gap-2 border px-5 py-3 font-mono text-xs font-bold uppercase tracking-[0.18em] transition-all duration-100 disabled:cursor-not-allowed disabled:opacity-40";
  const styles =
    variant === "primary"
      ? "border-ink bg-acid text-ink hover:bg-ink hover:text-acid focus-visible:outline-acid active:translate-x-[2px] active:translate-y-[2px] active:shadow-none"
      : "border-line-strong bg-transparent text-ink hover:border-ink hover:bg-bg focus-visible:outline-violet active:translate-y-px";
  return (
    <button
      type={type}
      className={`${base} ${styles} ${variant === "primary" ? "shadow-[4px_4px_0_0_var(--color-ink)]" : ""} ${className ?? ""}`}
      {...props}
    >
      {children}
    </button>
  );
}
