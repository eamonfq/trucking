import type {ReactNode} from 'react';
import {groupReceptions} from '@/lib/utils/reception-display';
type Piece={id:string;userId:string;code:string;receptionGroup?:{id:string;code?:string;index:number;total:number};contentsNote?:string;weightLabel:string;customer?:{name:string}|null};
// Only the operational DTO is accepted: never send billing snapshots to warehouse roles.
export function OperationalReceptionList<T extends Piece>({pieces,renderPiece}:{pieces:T[];renderPiece:(piece:T)=>ReactNode}){
 return <div className="grid gap-3">{groupReceptions(pieces).map(group=><article key={group.id} className="rounded-2xl border border-stone-200 bg-white p-5"><header className="flex flex-wrap justify-between gap-3"><div><h3 className="font-display text-lg font-bold">{group.code}</h3><p className="mt-1 text-sm text-navy-500">{group.boxes[0].customer?.name} · {group.boxes.length} piezas</p></div></header><div className="my-3 grid gap-2">{[...new Set(group.boxes.map(b=>`${b.contentsNote??'Paquete'} · ${b.weightLabel}`))].map(description=><p key={description} className="text-sm leading-5">{description}</p>)}</div><details open={group.boxes.length===1}><summary className="cursor-pointer text-sm font-semibold text-orange-700">Ver piezas, contactos y descarga</summary><div className="mt-3 grid gap-3">{group.boxes.map(renderPiece)}</div></details></article>)}</div>;
}
