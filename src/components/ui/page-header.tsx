import type { ReactNode } from "react";

export function PageHeader({ eyebrow, title, description, actions }: { eyebrow?: string; title: string; description?: string; actions?: ReactNode }) {
  return (
    <header className="flex flex-col gap-5 border-b border-stone-200 pb-7 sm:flex-row sm:items-end sm:justify-between">
      <div className="max-w-3xl">{eyebrow && <p className="mb-2 text-xs font-bold uppercase tracking-[0.18em] text-orange-600">{eyebrow}</p>}<h1 className="font-display text-3xl font-bold tracking-[-0.04em] text-navy-950 sm:text-4xl">{title}</h1>{description && <p className="mt-3 max-w-2xl text-base leading-7 text-navy-500">{description}</p>}</div>
      {actions && <div className="flex shrink-0 flex-wrap gap-3">{actions}</div>}
    </header>
  );
}
