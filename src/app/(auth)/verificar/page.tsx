import { AuthShell } from "@/components/auth/auth-shell";
import { VerificationForm } from "@/components/auth/verification-form";
import { auth } from "@/lib/i18n/catalogs/auth";
import { getT } from "@/lib/i18n/server";
export async function generateMetadata() { const t = await getT(auth); return { title: t("Confirma tu correo"), robots: { index: false, follow: false } }; }
export default async function VerifyPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const [{ token }, t] = await Promise.all([searchParams, getT(auth)]);
  return <AuthShell eyebrow={t("Un último paso")} title={t("Tu correo. Tu cuenta.")} description={t("Protegemos el acceso a tus envíos desde el primer día.")}><VerificationForm token={token} /></AuthShell>;
}
