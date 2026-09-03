import { Suspense } from "react";
import { AuthShell } from "@/components/auth/auth-shell";
import { LoginForm } from "@/components/auth/login-form";

export const metadata = { title: "Iniciar sesión" };
export default function LoginPage() { return <AuthShell eyebrow="Bienvenido de vuelta" title="Entra a tu cuenta." description="Consulta tus cajas en bodega, arma envíos y sigue cada etapa."><Suspense><LoginForm /></Suspense></AuthShell>; }
