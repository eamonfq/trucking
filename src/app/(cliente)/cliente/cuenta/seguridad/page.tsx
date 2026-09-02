import { SectionTitle } from "@/components/cliente/section-title";
import { ChangePasswordForm } from "@/components/cliente/change-password-form";
export default function SecurityPage() { return <><SectionTitle eyebrow="Cuenta" title="Seguridad" description="Confirma tu contraseña actual antes de establecer una nueva." /><div className="mt-7"><ChangePasswordForm /></div></>; }
