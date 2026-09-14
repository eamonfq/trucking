import type {Box} from "@/lib/types";
export function conflictingDeliverySnapshots(boxes:Box[]){
 const keys=boxes.flatMap(b=>{const r=b.recipientSnapshot;if(!r)return [];const a=r.address;return [JSON.stringify([r.name,r.phone,a.street,a.exteriorNumber,a.interiorNumber??"",a.neighborhood,a.postalCode,a.municipality,a.state,a.references??""])];});
 return new Set(keys).size>1;
}
