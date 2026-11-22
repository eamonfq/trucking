import { AuthShell } from "@/components/auth/auth-shell";
import { RegisterForm } from "@/components/auth/register-form";
import { COMPANY } from "@/lib/config/company";
import { configService } from "@/lib/services/config";
import { auth } from "@/lib/i18n/catalogs/auth";
import { getT } from "@/lib/i18n/server";

export async function generateMetadata() { const t = await getT(auth); return { title: t("Crear cuenta") }; }
export default async function RegisterPage() { const [flow, t] = await Promise.all([configService.getFlowConfig(), getT(auth)]); return <AuthShell eyebrow={t("Cuenta personal")} title={t("Crea tu cuenta.")} description={t("Dos pasos: tus datos de acceso y la dirección donde recibes en México.")}><RegisterForm originMode={flow.originMode} warehouseAddress={COMPANY.warehouseAddress} /></AuthShell>; }
