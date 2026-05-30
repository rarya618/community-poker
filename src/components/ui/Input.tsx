import { InputHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export function Input({ label, error, className, ...props }: InputProps) {
  return (
    <div className="flex flex-col gap-1">
      {label && <label className="text-sm font-medium text-zinc-300">{label}</label>}
      <input
        className={cn(
          "rounded-lg border border-white/20 bg-white/10 px-3 py-2.5 text-white placeholder:text-zinc-500 outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500 transition",
          className,
        )}
        {...props}
      />
      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  );
}
