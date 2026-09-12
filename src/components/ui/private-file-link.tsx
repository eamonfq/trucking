import { Download, FileCheck2 } from "lucide-react";
export function PrivateFileLink({id,name}:{id:string;name:string}) {
  return <a href={`/api/files/${id}`} className="flex min-h-12 items-center justify-between gap-3 rounded-lg border border-line-300 bg-white p-4 text-sm font-semibold text-navy-900 transition hover:bg-cream-100"><span className="flex min-w-0 items-center gap-2"><FileCheck2 aria-hidden="true" className="size-4 shrink-0 text-brand-700" /><span className="break-all">{name}</span></span><Download aria-hidden="true" className="size-4 shrink-0" /><span className="sr-only">Descargar archivo privado</span></a>;
}
