import type {Box} from '@/lib/types';
import {domain} from '@/lib/i18n/catalogs/domain';
import type {Locale} from '@/lib/i18n/config';
import {translator} from '@/lib/i18n/translate';
/** Ruta de camión guardada («Origen por confirmar → Valle de Juárez»): traduce la parte generada. */
export function localizeTruckRoute(route:string,locale:Locale='es'){
 return route.replace(/^Origen por confirmar(?= →)/,translator(domain,locale)('Origen por confirmar'));
}
/** Nombre de categoría: las que genera el código se traducen; las del catálogo son datos. */
export function localizeCategoryName(name:string,locale:Locale='es'){
 return locale==='en'&&(name==='Paquete por peso'||name==='Paquete por volumen'||name==='Carga personalizada')?translator(domain,locale)(name):name;
}
export function groupReceptions<T extends {id:string;userId:string;code:string;receptionGroup?:{id:string;code?:string}}>(boxes:T[]){
 const groups=new Map<string,{id:string;code:string;boxes:T[]}>();
 for(const box of boxes){const id=`${box.userId}:${box.receptionGroup?.id??box.id}`;const group=groups.get(id)??{id,code:box.receptionGroup?.code??box.code,boxes:[]};group.boxes.push(box);groups.set(id,group);}
 return [...groups.values()];
}
export function boxWeightLabel(box:Pick<Box,'weightLb'|'weightUnknown'|'billing'|'receptionConcept'>,locale:Locale='es'){
 const t=translator(domain,locale);
 if(box.weightUnknown)return t('Peso no registrado');
 const group=box.billing?.groupWeight;
 return group?t('{total} lb conjuntas / {pieces} piezas · sin pesaje individual',{total:group.totalWeightLb,pieces:group.pieces}):t('{weight} lb',{weight:box.weightLb});
}
export function receptionConceptSummaries(boxes:Box[],locale:Locale='es'){
 const t=translator(domain,locale);
 const groups=new Map<string,Box[]>();
 for(const box of boxes){const key=box.receptionConcept?.id??(box.billing?.groupWeight?'legacy-group':box.id);groups.set(key,[...(groups.get(key)??[]),box]);}
 return [...groups.values()].map(pieces=>({
  id:pieces[0].receptionConcept?.id??pieces[0].id,
  description:pieces[0].receptionConcept?.description??(pieces[0].billing?.groupWeight?t('Piezas con peso conjunto'):pieces[0].contentsNote??(pieces[0].categoryName?localizeCategoryName(pieces[0].categoryName,locale):t('Paquete'))),
  count:pieces.length,weight:pieces.length>1&&pieces.some(b=>b.weightUnknown)?t('{known} lb conocidas · {pending} piezas pendientes de pesar',{known:Math.round(pieces.filter(b=>!b.weightUnknown).reduce((n,b)=>n+b.weightLb,0)*1000)/1000,pending:pieces.filter(b=>b.weightUnknown).length}):pieces.length>1&&!pieces[0].billing?.groupWeight?t('{weight} lb · {pieces} piezas con pesaje individual',{weight:Math.round(pieces.reduce((n,b)=>n+b.weightLb,0)*1000)/1000,pieces:pieces.length}):boxWeightLabel(pieces[0],locale),
  amountUsd:Math.round(pieces.reduce((n,b)=>n+(b.billing?.amountUsd??b.customPriceUsd??0)+(b.excessFeeUsd??0),0)*100)/100,
  codes:pieces.map(b=>b.code),
 }));
}
