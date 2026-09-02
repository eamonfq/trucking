import { PackageOpen } from "lucide-react";
import type { ReactNode } from "react";

export function EmptyState({ title, description, action }: { title: string; description: string; action?: ReactNode }) {
  return (
    <div className="grid min-h-64 place-items-center rounded-card border border-dashed border-stone-200 bg-white p-8 text-center">
      <div><span className="mx-auto grid size-14 place-items-center rounded-2xl bg-cream-100 text-navy-500"><PackageOpen aria-hidden="true" className="size-6" /></span><h3 className="mt-4 font-display text-lg font-bold text-navy-950">{title}</h3><p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-navy-500">{description}</p>{action && <div className="mt-5">{action}</div>}</div>
    </div>
  );
}
