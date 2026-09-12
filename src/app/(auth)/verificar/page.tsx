import { AuthShell } from "@/components/auth/auth-shell";
import { VerificationForm } from "@/components/auth/verification-form";
export const metadata = { title: "Confirma tu correo", robots: { index: false, follow: false } };
export default async function VerifyPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token } = await searchParams;
  return <AuthShell eyebrow="Un último paso" title="Tu correo. Tu cuenta." description="Protegemos el acceso a tus envíos desde el primer día."><VerificationForm token={token} /></AuthShell>;
}
