"use client";
import {createContext,useContext,type ComponentProps,type ReactNode} from "react";
import NextLink from "next/link";
import {canAdmin,canAdminPath,type AdminPrincipal,type AdminSection} from "@/lib/auth/admin-permissions";
const Access=createContext<AdminPrincipal|null>(null);
export function useAdminPermission(section:AdminSection){const user=useContext(Access);return user?canAdmin(user,section):true;}
export function AdminAccessProvider({user,children}:{user:AdminPrincipal;children:ReactNode}){return <Access.Provider value={user}>{children}</Access.Provider>;}
/** Navigation mirrors server authorization. It is never the security boundary. */
export default function AdminLink(props:ComponentProps<typeof NextLink>){
 const user=useContext(Access);
 const path=typeof props.href==="string"?props.href:props.href.pathname;
 if(user&&path?.startsWith("/admin")&&!canAdminPath(user,path))return null;
 return <NextLink {...props}/>;
}
