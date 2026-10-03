import type {Box} from '@/lib/types';
export function groupReceptions<T extends {id:string;userId:string;code:string;receptionGroup?:{id:string;code?:string}}>(boxes:T[]){
 const groups=new Map<string,{id:string;code:string;boxes:T[]}>();
 for(const box of boxes){const id=`${box.userId}:${box.receptionGroup?.id??box.id}`;const group=groups.get(id)??{id,code:box.receptionGroup?.code??box.code,boxes:[]};group.boxes.push(box);groups.set(id,group);}
 return [...groups.values()];
}
export function boxWeightLabel(box:Pick<Box,'weightLb'|'weightUnknown'|'billing'|'receptionConcept'>){
 if(box.weightUnknown)return 'Peso no registrado';
 const group=box.billing?.groupWeight;
 return group?`${group.totalWeightLb} lb conjuntas / ${group.pieces} piezas · sin pesaje individual`:`${box.weightLb} lb`;
}
export function receptionConceptSummaries(boxes:Box[]){
 const groups=new Map<string,Box[]>();
 for(const box of boxes){const key=box.receptionConcept?.id??(box.billing?.groupWeight?'legacy-group':box.id);groups.set(key,[...(groups.get(key)??[]),box]);}
 return [...groups.values()].map(pieces=>({
  id:pieces[0].receptionConcept?.id??pieces[0].id,
  description:pieces[0].receptionConcept?.description??(pieces[0].billing?.groupWeight?'Piezas con peso conjunto':pieces[0].contentsNote??pieces[0].categoryName??'Paquete'),
  count:pieces.length,weight:pieces.length>1&&pieces.some(b=>b.weightUnknown)?`${Math.round(pieces.filter(b=>!b.weightUnknown).reduce((n,b)=>n+b.weightLb,0)*1000)/1000} lb conocidas · ${pieces.filter(b=>b.weightUnknown).length} piezas pendientes de pesar`:pieces.length>1&&!pieces[0].billing?.groupWeight?`${Math.round(pieces.reduce((n,b)=>n+b.weightLb,0)*1000)/1000} lb · ${pieces.length} piezas con pesaje individual`:boxWeightLabel(pieces[0]),
  amountUsd:Math.round(pieces.reduce((n,b)=>n+(b.billing?.amountUsd??b.customPriceUsd??0)+(b.excessFeeUsd??0),0)*100)/100,
  codes:pieces.map(b=>b.code),
 }));
}
