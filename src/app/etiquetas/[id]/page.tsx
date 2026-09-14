import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireAdminUser } from "@/lib/auth/actions";
import { logisticsService } from "@/lib/services/logistics";
import { PackageLabel } from "@/components/admin/package-label";
export const metadata:Metadata={title:"Etiqueta de paquete",robots:{index:false,follow:false}};
export default async function Page({params,searchParams}:{params:Promise<{id:string}>;searchParams:Promise<{grupo?:string}>}){
 await requireAdminUser();const {id}=await params;const box=await logisticsService.getBoxById(id);if(!box||!box.receivedAt)notFound();
 const customer=await logisticsService.getUserById(box.userId);
 const group=(await searchParams).grupo==="1"&&box.receptionGroup?(await logisticsService.getBoxes()).filter(b=>b.userId===box.userId&&b.receptionGroup?.id===box.receptionGroup!.id).sort((a,b)=>a.receptionGroup!.index-b.receptionGroup!.index):[box];
 return <>{group.map((b,i)=><PackageLabel key={b.id} controls={i===0} code={b.code} dimensions={b.dimensions} weightLb={b.weightLb} lockerCode={customer?.lockerCode??""} recipient={b.recipientSnapshot} position={b.receptionGroup?`${b.receptionGroup.index}/${b.receptionGroup.total}`:"1/1"}/>)}</>;
}
