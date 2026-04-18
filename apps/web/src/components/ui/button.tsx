"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

const buttonVariants = {
  default:
    "bg-cyan-300 text-slate-950 shadow-[0_14px_50px_rgba(103,232,249,0.18)] hover:bg-cyan-200",
  secondary:
    "border border-white/10 bg-white/5 text-slate-100 hover:bg-white/10",
  ghost: "text-slate-300 hover:bg-white/5 hover:text-white",
};

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: keyof typeof buttonVariants;
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", ...props }, ref) => (
    <button
      ref={ref}
      className={cn(
        "inline-flex h-11 items-center justify-center rounded-xl px-4 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-200/60 disabled:pointer-events-none disabled:opacity-50",
        buttonVariants[variant],
        className,
      )}
      {...props}
    />
  ),
);

Button.displayName = "Button";

