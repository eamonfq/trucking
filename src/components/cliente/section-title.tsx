import type { ReactNode } from "react";

export function SectionTitle({ eyebrow, title, description, action }: { eyebrow?: string; title: string; description?: string; action?: ReactNode }) {
  return <header className="flex flex-col justify-between gap-5 border-b border-stone-200 pb-7 sm:flex-row sm:items-end"><div>{eyebrow && <p className="text-xs font-bold uppercase tracking-[.18em] text-orange-600">{eyebrow}</p>}<h1 className="mt-2 font-display text-3xl font-bold tracking-[-.045em] text-navy-950 sm:text-4xl">{title}</h1>{description && <p className="mt-3 max-w-2xl text-sm leading-6 text-navy-500">{description}</p>}</div>{action}</header>;
}
