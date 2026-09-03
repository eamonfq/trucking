import { AuthShell } from "@/components/auth/auth-shell";
import { RecoveryForm } from "@/components/auth/recovery-form";
export const metadata = { title: "Recuperar contraseña" };
export default function RecoveryPage() { return <AuthShell eyebrow="Recuperación" title="Vuelve a entrar." description="Escribe tu correo y te enviamos un enlace. El mensaje es neutro para proteger tu cuenta."><RecoveryForm /></AuthShell>; }
