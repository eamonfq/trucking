import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils/cn";

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  const hasBackground = className?.split(/\s+/).some((value) => value.startsWith("bg-"));
  const hasShadow = className?.split(/\s+/).some((value) => value.startsWith("shadow-"));
  return <div className={cn("rounded-card border border-stone-200/80 p-5 sm:p-6", !hasBackground && "bg-white", !hasShadow && "shadow-soft", className)} {...props} />;
}
