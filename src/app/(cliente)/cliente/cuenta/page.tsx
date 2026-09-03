import Link from "next/link";
import { Shield } from "lucide-react";
import { AccountProfile } from "@/components/cliente/account-profile";
import { SectionTitle } from "@/components/cliente/section-title";
import { requireClientUser } from "@/lib/auth/actions";
import { formatDate } from "@/lib/utils/format";

export default async function AccountPage() {
  const user = await requireClientUser();
  return <>
    <SectionTitle eyebrow="Perfil" title="Mi cuenta" description="Actualiza tus datos de contacto y revisa la actividad de tu casillero." />
    <div className="mt-7 grid gap-5 lg:grid-cols-[1fr_.6fr]">
      <AccountProfile user={user} />
      <div className="grid content-start gap-5">
        <Link href="/cliente/cuenta/seguridad" className="rounded-card bg-navy-950 p-6 text-white transition hover:bg-navy-900">
          <Shield className="size-6 text-orange-500" />
          <h2 className="mt-5 font-display text-xl font-bold">Seguridad</h2>
          <p className="mt-2 text-sm leading-6 text-white/55">Cambia tu contraseña confirmando primero la actual.</p>
        </Link>
        <div className="rounded-card border border-stone-200 bg-white p-6">
          <h2 className="font-display text-lg font-bold text-navy-950">Actividad reciente</h2>
          <ol className="mt-4 grid gap-4">{user.activity.slice(0, 6).map((item) => <li key={item.id} className="border-l-2 border-orange-200 pl-4"><p className="text-sm font-semibold text-navy-900">{item.description}</p><p className="mt-1 text-xs text-navy-400">{item.actor} · {formatDate(item.at)}</p></li>)}</ol>
        </div>
      </div>
    </div>
  </>;
}
