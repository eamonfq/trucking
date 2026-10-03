import {z} from 'zod';
import type {BoxCategory} from '@/lib/config/box-categories';
import {calculateBilling,type BillingMode,type WeightPricing} from './billing';
import {receptionSchema} from '@/lib/schemas/admin';
import {allocateUnits,quoteGroupWeight} from './group-weight';

export type ReceptionConcept={id:string;description:string;quantity:number;mode:BillingMode;weightScope:'grupo'|'iguales';totalWeightLb:number;totalAmountUsd:number;weightUnknown:boolean};
const number=z.coerce.number().finite().min(0).default(0);
export const receptionConceptSchema=z.object({
 id:z.string().min(1).max(80),description:z.string().trim().min(2,'Describe el contenido de cada concepto.').max(300),quantity:z.coerce.number().int().min(1).max(50),
 mode:z.enum(['peso-real','peso-personalizado','volumen','fijo','manual']),weightScope:z.enum(['grupo','iguales']).default('grupo'),
 weightLb:z.coerce.number().finite().min(0).max(1000000).multipleOf(0.001).default(0),weightUnknown:z.boolean().default(false),priceUsd:z.coerce.number().finite().min(0).max(100000).multipleOf(0.01).default(0),rateUsd:z.coerce.number().finite().min(0).max(10000).multipleOf(0.01).default(0),
 length:number,width:number,height:number,categoryId:z.string().default(''),
});
export type ReceptionConceptInput=z.input<typeof receptionConceptSchema>;
export function prepareReceptionConcepts(input:unknown,settings:WeightPricing,rates:readonly BoxCategory[]){
 const concepts=z.array(receptionConceptSchema).min(1).max(50).parse(input);
 if(new Set(concepts.map(c=>c.id)).size!==concepts.length)throw new Error('No repitas el identificador de un concepto.');
 if(concepts.reduce((n,c)=>n+c.quantity,0)>50)throw new Error('La recepción admite hasta 50 piezas físicas en total.');
 const rows=concepts.flatMap(c=>{
  const category=rates.find(rate=>rate.id===c.categoryId&&rate.active!==false);
  if(c.mode==='fijo'&&!category)throw new Error('Selecciona una caja vigente del catálogo.');
  if(c.weightUnknown&&(c.mode!=='manual'||c.weightLb!==0))throw new Error('Solo una cotización acordada permite peso no registrado; no ingreses un peso estimado.');
  if(!c.weightUnknown&&c.weightLb<=0)throw new Error('Registra el peso del concepto o marca peso no registrado en precio acordado.');
  if(c.mode==='peso-personalizado'&&(c.rateUsd<=0||c.rateUsd>10000))throw new Error('Indica una tarifa válida por libra.');
  if(c.mode==='manual'&&(c.priceUsd<=0||c.priceUsd>100000))throw new Error('Indica el importe acordado para el concepto.');
  if(c.weightScope==='grupo'&&['volumen','fijo'].includes(c.mode)&&c.quantity>1)throw new Error('Catálogo y volumen requieren peso por pieza; separa conceptos si las piezas son distintas.');
  const dims=category&&c.mode==='fijo'?category.dimensions:{length:c.length,width:c.width,height:c.height};
  const pricing={...settings,...(c.mode==='peso-personalizado'?{pricePerLbUsd:c.rateUsd}:{})};
  const grouped=c.weightScope==='grupo'&&c.quantity>1;
  const quote=grouped&&!c.weightUnknown?quoteGroupWeight(c.weightLb,c.quantity,c.mode,pricing,c.priceUsd):undefined;
  const billing=quote?.billing??calculateBilling(c.mode,dims,c.weightLb,pricing,c.mode==='manual'?c.priceUsd:category?.priceUsd??0);
  if(c.mode==='fijo'&&category&&c.weightLb>category.maxWeightLb)throw new Error(`${category.name}: el peso excede el límite de la caja seleccionada.`);
  const amounts=quote?.amounts??(grouped?allocateUnits(billing.amountUsd,c.quantity):Array(c.quantity).fill(billing.amountUsd) as number[]);
  const weights=quote?.weights??Array(c.quantity).fill(c.weightUnknown?0:c.weightLb) as number[];
  const concept:ReceptionConcept={id:c.id,description:c.description,quantity:c.quantity,mode:c.mode,weightScope:c.weightScope,totalWeightLb:c.weightUnknown?0:Math.round(weights.reduce((a,b)=>a+b,0)*1000)/1000,totalAmountUsd:Math.round(amounts.reduce((a,b)=>a+b,0)*100)/100,weightUnknown:c.weightUnknown};
  return weights.map((weightLb,index)=>({
   item:{length:dims.length,width:dims.width,height:dims.height,weightLb,weightUnknown:c.weightUnknown,billingMode:c.mode,contentsNote:c.description,
    customPriceUsd:c.mode==='manual'?amounts[index]:undefined,customRatePerLbUsd:c.mode==='peso-personalizado'?c.rateUsd:undefined,
    overrideCategory:c.mode==='fijo'?category!.id:'',overrideReason:c.mode==='fijo'?'Selección de precio fijo por caja del catálogo.':''},
   concept,allocatedAmountUsd:amounts[index],
   groupWeight:grouped&&!c.weightUnknown?{totalWeightLb:concept.totalWeightLb,totalAmountUsd:concept.totalAmountUsd,pieces:c.quantity}:undefined,
  }));
 });
 for(const row of rows){const parsed=receptionSchema.safeParse({customer:"concept",...row.item});if(!parsed.success)throw new Error(parsed.error.issues[0]?.message??"Revisa las piezas del concepto.");}
 return {rows,total:Math.round(rows.reduce((n,r)=>n+r.allocatedAmountUsd,0)*100)/100,count:rows.length};
}
