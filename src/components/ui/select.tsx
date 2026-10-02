import { forwardRef, useId, type SelectHTMLAttributes } from "react";
import { ChevronDown } from "lucide-react";
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
  const generatedId = useId();
  const selectId = id ?? props.name ?? generatedId;
  const errorId = `${selectId}-error`;
  return (
    <div className={cn("grid min-w-0 gap-2 text-xs font-medium", tone === "dark" ? "text-white/80" : "text-ink-700")}>
      <label htmlFor={selectId} className={hideLabel ? "sr-only" : undefined}>{label}</label>
      <span className="relative block min-w-0">
      <select ref={ref} id={selectId} aria-invalid={Boolean(error)} aria-describedby={error ? errorId : undefined} className={cn("min-h-14 w-full min-w-0 appearance-none truncate rounded-md border-[1.5px] border-line-300 bg-white py-3 pl-4 pr-10 text-base font-medium text-navy-900 outline-none transition hover:border-label-600 focus:border-brand-700 disabled:bg-cream-100 disabled:text-ink-500", error && "border-danger", className)} {...props}>
        {options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
      </select>
      <ChevronDown aria-hidden="true" className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-ink-500" />
      </span>
      {error && <span id={errorId} className={cn("text-xs font-normal", tone === "dark" ? "text-[#FF9C93]" : "text-danger")}>{error}</span>}
    </div>
  );
});
