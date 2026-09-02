import Link from "next/link";
import { COMPANY } from "@/lib/config/company";

export function BrandLogo({ inverse = false }: { inverse?: boolean }) {
  return (
    <Link href="/" className="inline-flex items-center gap-3 rounded-lg" aria-label={`${COMPANY.name}, inicio`}>
      <span className="grid size-10 place-items-center rounded-xl bg-orange-500 font-display text-sm font-extrabold text-white shadow-[0_8px_20px_rgba(232,98,28,.25)]">A&L</span>
      <span className={`font-display text-sm font-extrabold leading-tight ${inverse ? "text-white" : "text-navy-950"}`}>Trucking<br /><span className={inverse ? "text-white/65" : "text-navy-500"}>Logistics</span></span>
    </Link>
  );
}
