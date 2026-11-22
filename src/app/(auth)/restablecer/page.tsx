import { AuthShell } from "@/components/auth/auth-shell";
import { ResetForm } from "@/components/auth/reset-form";
import { auth } from "@/lib/i18n/catalogs/auth";
import { getT } from "@/lib/i18n/server";
export async function generateMetadata() { const t = await getT(auth); return { title: t("Restablecer contraseña") }; }
export default async function ResetPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) { const [{ token }, t] = await Promise.all([searchParams, getT(auth)]); return <AuthShell eyebrow={t("Seguridad")} title={t("Crea una contraseña nueva.")} description={t("Usa una combinación que no hayas utilizado en otros servicios.")}><ResetForm token={token} /></AuthShell>; }
