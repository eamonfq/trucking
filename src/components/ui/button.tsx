import { LoaderCircle } from "lucide-react";
import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils/cn";

type ButtonVariant = "primary" | "secondary" | "ghost" | "destructive";

const variants: Record<ButtonVariant, string> = {
  primary: "bg-orange-500 text-white shadow-[0_10px_25px_rgba(232,98,28,.24)] hover:bg-orange-600",
  secondary: "border border-navy-200 bg-white text-navy-900 hover:border-navy-400 hover:bg-navy-50",
  ghost: "bg-transparent text-navy-700 hover:bg-navy-100",
  destructive: "bg-danger-700 text-white hover:bg-[#8f1b13]",
};

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  loading?: boolean;
};

export function Button({ className, variant = "primary", loading = false, disabled, children, ...props }: ButtonProps) {
  return (
    <button
      className={cn("inline-flex min-h-11 items-center justify-center gap-2 rounded-full px-5 text-sm font-semibold transition duration-200 ease-premium disabled:cursor-not-allowed disabled:opacity-55", variants[variant], className)}
      disabled={disabled || loading}
      aria-busy={loading}
      {...props}
    >
      {loading && <LoaderCircle aria-hidden="true" className="size-4 animate-spin" />}
      {children}
    </button>
  );
}
