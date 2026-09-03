import { LoaderCircle } from "lucide-react";
import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils/cn";

type ButtonVariant = "primary" | "secondary" | "ghost" | "destructive";

/* Alturas y radios del kit del rediseño: 48px de alto, radio de 10px. */
const variants: Record<ButtonVariant, string> = {
  primary: "bg-brand-600 text-white hover:bg-brand-700 disabled:bg-[#EFE7DA] disabled:text-ink-500",
  secondary: "border-[1.5px] border-navy-900 bg-transparent text-navy-900 hover:bg-navy-900 hover:text-white",
  ghost: "border-[1.5px] border-line-300 bg-transparent text-ink-700 hover:border-navy-900 hover:text-navy-900",
  destructive: "border-[1.5px] border-danger bg-transparent text-danger hover:bg-danger hover:text-white",
};

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  loading?: boolean;
};

export function Button({ className, variant = "primary", loading = false, disabled, children, ...props }: ButtonProps) {
  return (
    <button
      className={cn("inline-flex min-h-12 items-center justify-center gap-2 rounded-md px-5.5 text-sm font-semibold transition duration-200 ease-premium disabled:cursor-not-allowed", variants[variant], className)}
      disabled={disabled || loading}
      aria-busy={loading}
      {...props}
    >
      {loading && <LoaderCircle aria-hidden="true" className="size-4 animate-spin" />}
      {children}
    </button>
  );
}
