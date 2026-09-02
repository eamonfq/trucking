import { forwardRef, type TextareaHTMLAttributes } from "react";
import { cn } from "@/lib/utils/cn";

type TextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement> & { label: string; error?: string };

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea({ id, label, error, className, ...props }, ref) {
  const textareaId = id ?? props.name;
  return (
    <label className="grid gap-2 text-sm font-semibold text-navy-900" htmlFor={textareaId}>
      {label}
      <textarea ref={ref} id={textareaId} aria-invalid={Boolean(error)} className={cn("min-h-28 resize-y rounded-xl border border-stone-200 bg-white px-4 py-3 text-base font-normal text-navy-950 outline-none transition hover:border-navy-400 focus:border-orange-500", error && "border-danger-700", className)} {...props} />
      {error && <span className="text-xs font-normal text-danger-700">{error}</span>}
    </label>
  );
});
