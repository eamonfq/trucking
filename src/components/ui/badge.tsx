import type { HTMLAttributes } from "react";
import { getStatusClassName, getStatusLabel } from "@/lib/config/status";
import { cn } from "@/lib/utils/cn";

export function Badge({ className, ...props }: HTMLAttributes<HTMLSpanElement>) {
  return <span className={cn("inline-flex items-center rounded-full bg-navy-100 px-2.5 py-1 text-xs font-bold text-navy-700", className)} {...props} />;
}

export function StatusBadge({ status }: { status: string }) {
  return <Badge className={getStatusClassName(status)}>{getStatusLabel(status)}</Badge>;
}
