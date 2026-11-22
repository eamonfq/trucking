import { SectionTitle } from "@/components/cliente/section-title";
import { ChangePasswordForm } from "@/components/cliente/change-password-form";
import { clientPages } from "@/lib/i18n/catalogs/client-pages";
import { getT } from "@/lib/i18n/server";
export default async function SecurityPage() { const t = await getT(clientPages); return <><SectionTitle eyebrow={t("Cuenta")} title={t("Seguridad")} description={t("Confirma tu contraseña actual antes de establecer una nueva.")} /><div className="mt-7"><ChangePasswordForm /></div></>; }
