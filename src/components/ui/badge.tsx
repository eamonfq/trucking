"use client";
import type { HTMLAttributes } from "react";
import { getStatusClassName, getStatusLabel } from "@/lib/config/status";
import { cn } from "@/lib/utils/cn";
import { useLocale } from "@/lib/i18n/provider";

export function Badge({ className, ...props }: HTMLAttributes<HTMLSpanElement>) {
  return <span className={cn("inline-flex items-center rounded-md border px-3 py-1.5 text-xs font-semibold", className)} {...props} />;
}

export function StatusBadge({ status }: { status: string }) {
  const locale = useLocale();
  return <Badge className={getStatusClassName(status)}>{getStatusLabel(status, locale)}</Badge>;
}
