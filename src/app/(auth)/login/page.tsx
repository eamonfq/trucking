import { Suspense } from "react";
import { AuthShell } from "@/components/auth/auth-shell";
import { LoginForm } from "@/components/auth/login-form";
import { auth } from "@/lib/i18n/catalogs/auth";
import { getT } from "@/lib/i18n/server";

export async function generateMetadata() { const t = await getT(auth); return { title: t("Iniciar sesión") }; }
export default async function LoginPage() { const t = await getT(auth); return <AuthShell eyebrow={t("Bienvenido de vuelta")} title={t("Entra a tu cuenta.")} description={t("Consulta tus cajas en bodega, arma envíos y sigue cada etapa.")}><Suspense><LoginForm /></Suspense></AuthShell>; }
