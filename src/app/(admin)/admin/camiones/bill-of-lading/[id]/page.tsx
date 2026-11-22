import { ArrowLeft } from "lucide-react";
import { notFound } from "next/navigation";
import Link from "@/components/admin/admin-access";
import { BillOfLadingEditor } from "@/components/admin/bill-of-lading-editor";
import { SectionTitle } from "@/components/cliente/section-title";
import { requireAdminUser } from "@/lib/auth/actions";
import { billOfLadingService } from "@/lib/services/bill-of-lading";
import { trucksBillOfLading } from "@/lib/i18n/catalogs/trucks-bill-of-lading";
import { getT } from "@/lib/i18n/server";

export default async function BillOfLadingPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdminUser(["camiones"]);
  const { id } = await params;
  const bill = await billOfLadingService.get(id);
  if (!bill) notFound();
  const t = await getT(trucksBillOfLading);
  return <><Link href="/admin/camiones/bill-of-lading" className="mb-5 inline-flex items-center gap-2 text-sm font-semibold text-navy-500 hover:text-orange-600"><ArrowLeft className="size-4" />{t("Volver a bills of lading")}</Link><SectionTitle eyebrow="Bill of Lading" title={bill.code} description={bill.truckCode ? t("Camión {code}. Revisa cada sección antes de descargar el PDF.", { code: bill.truckCode }) : t("Revisa cada sección antes de descargar el PDF.")} /><div className="mt-7"><BillOfLadingEditor key={bill.updatedAt} initial={bill} /></div></>;
}
