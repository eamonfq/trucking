import { forwardRef, type SelectHTMLAttributes } from "react";
import { cn } from "@/lib/utils/cn";

type SelectProps = SelectHTMLAttributes<HTMLSelectElement> & {
  label: string;
  options: Array<{ value: string; label: string }>;
  error?: string;
  hideLabel?: boolean;
  /** "dark" cuando el campo vive sobre una superficie azul marino. */
  tone?: "light" | "dark";
};

export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { id, label, options, error, hideLabel = false, tone = "light", className, ...props },
  ref,
) {
  const selectId = id ?? props.name;
  return (
    <label className={cn("grid gap-2 text-xs font-medium", tone === "dark" ? "text-white/80" : "text-ink-700")} htmlFor={selectId}>
      <span className={hideLabel ? "sr-only" : undefined}>{label}</span>
      <select ref={ref} id={selectId} aria-invalid={Boolean(error)} className={cn("min-h-14 w-full rounded-md border-[1.5px] border-line-300 bg-white px-4 text-base font-medium text-navy-900 outline-none transition hover:border-label-600 focus:border-brand-700", error && "border-danger", className)} {...props}>
        {options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
      </select>
      {error && <span className={cn("text-xs font-normal", tone === "dark" ? "text-[#FF9C93]" : "text-danger")}>{error}</span>}
    </label>
  );
});
