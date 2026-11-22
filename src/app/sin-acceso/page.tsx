import Link from "next/link";
import {signOut} from "@/lib/auth/actions";
import { common } from "@/lib/i18n/catalogs/common";
import { getT } from "@/lib/i18n/server";
export default async function NoAccessPage(){const t=await getT(common);return <main className="mx-auto max-w-xl px-6 py-24"><h1 className="text-3xl font-bold text-navy-950">{t("Tu acceso necesita una asignación")}</h1><p className="my-6 text-navy-600">{t("Solicita al administrador que habilite las secciones correspondientes a tu trabajo.")}</p><form action={signOut}><button className="rounded-xl bg-navy-950 px-5 py-3 text-white">{t("Cerrar sesión")}</button></form><Link href="/" className="mt-6 inline-block">{t("Volver al inicio")}</Link></main>;}
