import { AuthShell } from "@/components/auth/auth-shell";
import { ResetForm } from "@/components/auth/reset-form";
export const metadata = { title: "Restablecer contraseña" };
export default async function ResetPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) { const { token } = await searchParams; return <AuthShell eyebrow="Seguridad" title="Crea una nueva contraseña" description="Usa una combinación que no hayas utilizado en otros servicios."><ResetForm token={token} /></AuthShell>; }
