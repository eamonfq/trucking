import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireAdminUser } from "@/lib/auth/actions";
import { logisticsService } from "@/lib/services/logistics";
import { PackageLabel } from "@/components/admin/package-label";
export const metadata:Metadata={title:"Etiqueta de paquete",robots:{index:false,follow:false}};
export default async function Page({params}:{params:Promise<{id:string}>}){await requireAdminUser();const {id}=await params;const box=await logisticsService.getBoxById(id);if(!box||!box.receivedAt)notFound();const customer=await logisticsService.getUserById(box.userId);return <PackageLabel code={box.code} dimensions={box.dimensions} weightLb={box.weightLb} lockerCode={customer?.lockerCode??""}/>;}
