import "server-only";
import {AsyncLocalStorage} from "node:async_hooks";
export type ReceptionGroup = {id:string;code:`BX-${string}`;index:number;total:number};
const context = new AsyncLocalStorage<ReceptionGroup>();
export const currentReceptionGroup = () => context.getStore();
export function withReceptionPiece<T>(group:ReceptionGroup, work:()=>Promise<T>){return context.run(group,work);}
