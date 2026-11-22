"use client";
import {Trash2} from "lucide-react";
import AdminLink from "./admin-access";
import {customersCommon} from "@/lib/i18n/catalogs/customers-common";
import {useT} from "@/lib/i18n/provider";
export function DeleteUserLink({id,name}:{id:string;name:string}){
 const t=useT(customersCommon);
 return <AdminLink href={`/admin/eliminar?usuario=${encodeURIComponent(id)}`} aria-label={t("Eliminar {name}",{name})} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl px-3 text-sm font-medium text-red-700 transition hover:bg-red-50 focus-visible:outline-2 focus-visible:outline-red-700"><Trash2 className="size-4"/>{t("Eliminar")}</AdminLink>;
}
