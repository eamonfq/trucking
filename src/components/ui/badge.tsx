import type { HTMLAttributes } from "react";
import { getStatusClassName, getStatusLabel } from "@/lib/config/status";
import { cn } from "@/lib/utils/cn";

export function Badge({ className, ...props }: HTMLAttributes<HTMLSpanElement>) {
  return <span className={cn("inline-flex items-center rounded-md border px-3 py-1.5 text-xs font-semibold", className)} {...props} />;
}

export function StatusBadge({ status }: { status: string }) {
  return <Badge className={getStatusClassName(status)}>{getStatusLabel(status)}</Badge>;
}
