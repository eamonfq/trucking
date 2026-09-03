import { forwardRef, type InputHTMLAttributes } from "react";
import { cn } from "@/lib/utils/cn";

type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  error?: string;
  hint?: string;
  /** "dark" cuando el campo vive sobre una superficie azul marino. */
  tone?: "light" | "dark";
};

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { id, label, error, hint, tone = "light", className, ...props },
  ref,
) {
  const inputId = id ?? props.name;
  const descriptionId = `${inputId}-description`;
  return (
    <label className={cn("grid gap-2 text-xs font-medium", tone === "dark" ? "text-white/80" : "text-ink-700")} htmlFor={inputId}>
      {label}
      <input
        ref={ref}
        id={inputId}
        aria-invalid={Boolean(error)}
        aria-describedby={error || hint ? descriptionId : undefined}
        className={cn("min-h-14 w-full rounded-md border-[1.5px] border-line-300 bg-white px-4 text-base font-medium text-navy-900 outline-none transition placeholder:font-normal placeholder:text-label-600 hover:border-label-600 focus:border-brand-700 disabled:bg-cream-100 disabled:text-ink-500", error && "border-danger bg-[#FFF7F6]", className)}
        {...props}
      />
      {(error || hint) && <span id={descriptionId} className={cn("text-xs font-normal", error ? (tone === "dark" ? "text-[#FF9C93]" : "text-danger") : tone === "dark" ? "text-white/55" : "text-ink-500")}>{error ?? hint}</span>}
    </label>
  );
});
