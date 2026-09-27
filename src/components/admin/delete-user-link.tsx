"use client";
import {Trash2} from "lucide-react";
import AdminLink from "./admin-access";
export function DeleteUserLink({id,name}:{id:string;name:string}){
 return <AdminLink href={`/admin/eliminar?usuario=${encodeURIComponent(id)}`} aria-label={`Eliminar ${name}`} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl px-3 text-sm font-medium text-red-700 transition hover:bg-red-50 focus-visible:outline-2 focus-visible:outline-red-700"><Trash2 className="size-4"/>Eliminar</AdminLink>;
}
