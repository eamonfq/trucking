import "server-only";
import {collection,transactionConnection} from "./store";
import {boxes,invoices,shipments} from "./collections";
const counters=collection<{id:string;value:number}>("documentSequences");
type Kind="box"|"invoice"|"shipment";
function counter(kind:Kind){
 const values=kind==="box"?boxes.map(b=>b.receptionGroup?.code??b.code):kind==="invoice"?invoices.map(i=>i.number):shipments.map(s=>s.code);
 const expression=kind==="invoice"?/^AL-26-(\d+)$/:kind==="box"?/^BX-26(\d+)(?:-\d+)?$/:/^SH-26(\d+)$/;
 const baseline=values.reduce((max,v)=>Math.max(max,Number(v.match(expression)?.[1]??0)),values.length);
 let record=counters.find(c=>c.id===kind);
 if(!record){record={id:kind,value:baseline};counters.push(record);}else record.value=Math.max(record.value,baseline);
 return record;
}
/** Seed before removing test records so previously issued references are never reused. */
export function reserveDocumentSequences(){for(const kind of ["box","invoice","shipment"] as const)counter(kind);}
export function nextDocumentSequence(kind:Kind){if(!transactionConnection())throw new Error("A document sequence requires a transaction.");return ++counter(kind).value;}
