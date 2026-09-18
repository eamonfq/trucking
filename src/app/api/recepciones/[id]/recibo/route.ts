import path from 'node:path';
import {renderToBuffer} from '@react-pdf/renderer';
import {getSession} from '@/lib/auth/actions';
import {logisticsService} from '@/lib/services/logistics';
import {ThermalDocument} from '@/lib/pdf/thermal-document';
export async function GET(_:Request,{params}:{params:Promise<{id:string}>}){
 const session=await getSession();if(!session||session.role==='operador')return new Response('No autorizado',{status:401});
 const {id}=await params;const [all,availableInvoices]=await Promise.all([logisticsService.getBoxes(),logisticsService.getInvoices()]);
 const first=all.find(b=>b.id===id&&b.receivedAt);if(!first)return new Response('Recepción no encontrada',{status:404});
 const boxes=(first.receptionGroup?all.filter(b=>b.userId===first.userId&&b.receptionGroup?.id===first.receptionGroup!.id):[first]).sort((a,b)=>(a.receptionGroup?.index??1)-(b.receptionGroup?.index??1));
 const ids=new Set(boxes.map(b=>b.id));
 // Do not include a later invoice spanning unrelated receptions in this voucher.
 const invoices=availableInvoices.filter(i=>i.userId===first.userId&&i.boxIds?.length&&i.boxIds.every(id=>ids.has(id)));
 const reference=first.receptionGroup?.code??first.code;
 const buffer=await renderToBuffer(ThermalDocument({reference,boxes,invoices,receipt:true,logoPath:path.join(process.cwd(),'public/brand/logoayl.png')}));
 return new Response(new Uint8Array(buffer),{headers:{'Content-Type':'application/pdf','Content-Disposition':`inline; filename="recibo-${reference}.pdf"`,'Cache-Control':'private, no-store'}});
}
