import * as React from "react";
import { cn } from "@/lib/utils";

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "secondary" | "destructive" | "outline";
}

export function Badge({ className, variant = "default", ...props }: BadgeProps) {
  const variants = {
    default: "border-transparent bg-amber-500/20 text-amber-300 border border-amber-500/30",
    secondary: "border-transparent bg-slate-800 text-slate-300",
    destructive: "border-transparent bg-red-500/20 text-red-300 border border-red-500/30",
    outline: "border-slate-700 text-slate-300",
  };
  return (
    <div
      className={cn(
        "inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none",
        variants[variant],
        className
      )}
      {...props}
    />
  );
}
