import { forwardRef, type SelectHTMLAttributes } from "react";
import { cn } from "@/lib/utils/cn";

type SelectProps = SelectHTMLAttributes<HTMLSelectElement> & {
  label: string;
  options: Array<{ value: string; label: string }>;
  error?: string;
};

export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { id, label, options, error, className, ...props },
  ref,
) {
  const selectId = id ?? props.name;
  return (
    <label className="grid gap-2 text-sm font-semibold text-navy-900" htmlFor={selectId}>
      {label}
      <select ref={ref} id={selectId} aria-invalid={Boolean(error)} className={cn("min-h-12 w-full rounded-xl border border-stone-200 bg-white px-4 text-base font-normal text-navy-950 outline-none transition hover:border-navy-400 focus:border-orange-500", error && "border-danger-700", className)} {...props}>
        {options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
      </select>
      {error && <span className="text-xs font-normal text-danger-700">{error}</span>}
    </label>
  );
});
