import { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "danger" | "ghost";
  size?: "sm" | "md" | "lg";
}

export function Button({ variant = "primary", size = "md", className, children, ...props }: ButtonProps) {
  return (
    <button
      className={cn(
        "rounded-lg font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed",
        {
          primary: "bg-green-600 hover:bg-green-500 text-white",
          secondary: "bg-zinc-700 hover:bg-zinc-600 text-white",
          danger: "bg-red-700 hover:bg-red-600 text-white",
          ghost: "bg-transparent hover:bg-white/10 text-white border border-white/20",
        }[variant],
        {
          sm: "px-3 py-1.5 text-sm",
          md: "px-5 py-2.5 text-sm",
          lg: "px-6 py-3 text-base",
        }[size],
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}
