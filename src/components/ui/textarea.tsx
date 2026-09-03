import { forwardRef, type TextareaHTMLAttributes } from "react";
import { cn } from "@/lib/utils/cn";

type TextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement> & { label: string; error?: string; hint?: string };

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea({ id, label, error, hint, className, ...props }, ref) {
  const textareaId = id ?? props.name;
  return (
    <label className="grid gap-2 text-xs font-medium text-ink-700" htmlFor={textareaId}>
      {label}
      <textarea ref={ref} id={textareaId} aria-invalid={Boolean(error)} className={cn("min-h-28 resize-y rounded-md border-[1.5px] border-line-300 bg-white px-4 py-3 text-base font-medium text-navy-900 outline-none transition placeholder:font-normal placeholder:text-label-600 hover:border-label-600 focus:border-brand-700", error && "border-danger", className)} {...props} />
      {(error || hint) && <span className={`text-xs font-normal ${error ? "text-danger" : "text-ink-500"}`}>{error ?? hint}</span>}
    </label>
  );
});
