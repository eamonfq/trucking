import { Check } from "lucide-react";
import { forwardRef, type InputHTMLAttributes } from "react";
import { cn } from "@/lib/utils/cn";

type CheckboxProps = Omit<InputHTMLAttributes<HTMLInputElement>, "type"> & { label: string };

export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(function Checkbox({ label, className, ...props }, ref) {
  return (
    <label className="group inline-flex cursor-pointer items-center gap-2.5 text-sm text-ink-700">
      <span className="relative grid size-5 place-items-center">
        <input ref={ref} type="checkbox" className={cn("peer size-5 appearance-none rounded-sm border-[1.5px] border-line-300 bg-white transition checked:border-brand-600 checked:bg-brand-600", className)} {...props} />
        <Check aria-hidden="true" className="pointer-events-none absolute size-3.5 text-white opacity-0 peer-checked:opacity-100" strokeWidth={3} />
      </span>
      {label}
    </label>
  );
});
