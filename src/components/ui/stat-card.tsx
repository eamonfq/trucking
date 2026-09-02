import type { LucideIcon } from "lucide-react";
import { Card } from "@/components/ui/card";

export function StatCard({ label, value, detail, icon: Icon }: { label: string; value: string; detail?: string; icon: LucideIcon }) {
  return (
    <Card className="group shadow-none transition duration-200 hover:-translate-y-0.5 hover:shadow-soft">
      <div className="flex items-start justify-between gap-4">
        <div><p className="text-sm font-medium text-navy-500">{label}</p><p className="mt-2 font-display text-3xl font-bold tracking-[-0.04em] text-navy-950">{value}</p>{detail && <p className="mt-2 text-xs text-navy-500">{detail}</p>}</div>
        <span className="grid size-11 place-items-center rounded-2xl bg-orange-50 text-orange-600"><Icon aria-hidden="true" className="size-5" /></span>
      </div>
    </Card>
  );
}
