import { AuthShell } from "@/components/auth/auth-shell";
import { RegisterForm } from "@/components/auth/register-form";
import { COMPANY } from "@/lib/config/company";
import { configService } from "@/lib/services/config";

export const metadata = { title: "Crear cuenta" };
export default async function RegisterPage() { const flow = await configService.getFlowConfig(); return <AuthShell eyebrow="Cuenta personal" title="Crea tu cuenta." description="Dos pasos: tus datos de acceso y la dirección donde recibes en México."><RegisterForm originMode={flow.originMode} warehouseAddress={COMPANY.warehouseAddress} /></AuthShell>; }
