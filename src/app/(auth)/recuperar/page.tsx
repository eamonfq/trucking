import { AuthShell } from "@/components/auth/auth-shell";
import { RecoveryForm } from "@/components/auth/recovery-form";
import { auth } from "@/lib/i18n/catalogs/auth";
import { getT } from "@/lib/i18n/server";
export async function generateMetadata() { const t = await getT(auth); return { title: t("Recuperar contraseña") }; }
export default async function RecoveryPage() { const t = await getT(auth); return <AuthShell eyebrow={t("Recuperación")} title={t("Vuelve a entrar.")} description={t("Escribe tu correo y te enviamos un enlace. El mensaje es neutro para proteger tu cuenta.")}><RecoveryForm /></AuthShell>; }
