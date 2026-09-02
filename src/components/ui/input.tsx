import { forwardRef, type InputHTMLAttributes } from "react";
import { cn } from "@/lib/utils/cn";

type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  error?: string;
  hint?: string;
};

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { id, label, error, hint, className, ...props },
  ref,
) {
  const inputId = id ?? props.name;
  const descriptionId = `${inputId}-description`;
  return (
    <label className="grid gap-2 text-sm font-semibold text-navy-900" htmlFor={inputId}>
      {label}
      <input
        ref={ref}
        id={inputId}
        aria-invalid={Boolean(error)}
        aria-describedby={error || hint ? descriptionId : undefined}
        className={cn("min-h-12 w-full rounded-xl border border-stone-200 bg-white px-4 text-base font-normal text-navy-950 shadow-[0_1px_0_rgba(28,43,75,.03)] outline-none transition placeholder:text-navy-400 hover:border-navy-400 focus:border-orange-500 disabled:bg-stone-100", error && "border-danger-700", className)}
        {...props}
      />
      {(error || hint) && <span id={descriptionId} className={cn("text-xs font-normal", error ? "text-danger-700" : "text-navy-500")}>{error ?? hint}</span>}
    </label>
  );
});
