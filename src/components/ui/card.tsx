import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils/cn";

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("rounded-card border border-stone-200/80 bg-white p-5 shadow-soft sm:p-6", className)} {...props} />;
}
