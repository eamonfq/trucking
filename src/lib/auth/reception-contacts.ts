"use server";
import { requireAdminUser } from "./actions";
import { withStore } from "@/lib/db/store";
import { recipients,addresses } from "@/lib/db/collections";
export async function getReceptionContacts(userId:string){await requireAdminUser();return withStore(async()=>({recipients:recipients.filter(r=>r.userId===userId),addresses:addresses.filter(a=>a.userId===userId)}));}
