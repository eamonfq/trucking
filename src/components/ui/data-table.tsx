import type { ReactNode } from "react";
import { EmptyState } from "@/components/ui/empty-state";

export type Column<T> = { key: string; header: string; render: (row: T) => ReactNode; className?: string };

export function DataTable<T>({ columns, rows, getRowKey, emptyTitle = "No hay registros", emptyDescription = "Los elementos aparecerán aquí cuando estén disponibles." }: { columns: Column<T>[]; rows: T[]; getRowKey: (row: T) => string; emptyTitle?: string; emptyDescription?: string }) {
  if (rows.length === 0) return <EmptyState title={emptyTitle} description={emptyDescription} />;
  return (
    <div className="overflow-x-auto rounded-2xl border border-stone-200 bg-white">
      <table className="w-full min-w-[640px] border-collapse text-left text-sm">
        <thead className="bg-cream-100/70 text-xs uppercase tracking-[0.12em] text-navy-500"><tr>{columns.map((column) => <th key={column.key} className={`px-5 py-4 font-bold ${column.className ?? ""}`}>{column.header}</th>)}</tr></thead>
        <tbody className="divide-y divide-stone-200">{rows.map((row) => <tr key={getRowKey(row)} className="transition hover:bg-cream-50">{columns.map((column) => <td key={column.key} className={`px-5 py-4 text-navy-700 ${column.className ?? ""}`}>{column.render(row)}</td>)}</tr>)}</tbody>
      </table>
    </div>
  );
}
