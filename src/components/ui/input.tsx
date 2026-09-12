"use client";
import { forwardRef, useId, useState, type InputHTMLAttributes } from "react";
import { Eye, EyeOff } from "lucide-react";
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
  const generatedId = useId();
  const inputId = id ?? props.name ?? generatedId;
  const [visible, setVisible] = useState(false);
  const isPassword = props.type === "password";
  const descriptionId = `${inputId}-description`;
  return (
    <div className={cn("grid gap-2 text-xs font-medium", tone === "dark" ? "text-white/80" : "text-ink-700")}>
      <label htmlFor={inputId}>{label}</label>
      <span className="relative block">
      <input
        ref={ref}
        id={inputId}
        aria-invalid={Boolean(error)}
        aria-describedby={error || hint ? descriptionId : undefined}
        className={cn("min-h-14 w-full rounded-md border-[1.5px] border-line-300 bg-white px-4 text-base font-medium text-navy-900 outline-none transition placeholder:font-normal placeholder:text-label-600 hover:border-label-600 focus:border-brand-700 disabled:bg-cream-100 disabled:text-ink-500", error && "border-danger bg-[#FFF7F6]", isPassword && "pr-14", className)}
        {...props}
        type={isPassword && visible ? "text" : props.type}
      />
      {isPassword && <button type="button" aria-label={visible ? "Ocultar contraseña" : "Mostrar contraseña"} aria-pressed={visible} onClick={() => setVisible(value => !value)} className="absolute right-1 top-1 grid size-12 place-items-center rounded-md text-ink-500 focus-visible:outline-2 focus-visible:outline-brand-700">{visible ? <EyeOff className="size-5" /> : <Eye className="size-5" />}</button>}
      </span>
      {(error || hint) && <span id={descriptionId} className={cn("text-xs font-normal", error ? (tone === "dark" ? "text-[#FF9C93]" : "text-danger") : tone === "dark" ? "text-white/55" : "text-ink-500")}>{error ?? hint}</span>}
    </div>
  );
});
