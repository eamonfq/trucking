import type {Box} from "@/lib/types";
export function truckLoad(boxes:Pick<Box,"weightLb"|"dimensions">[]){
 const weightLb=boxes.reduce((n,b)=>n+b.weightLb,0);
 const volumeIn3=boxes.reduce((n,b)=>n+b.dimensions.length*b.dimensions.width*b.dimensions.height,0);
 const missingDimensions=boxes.filter(b=>!Object.values(b.dimensions).every(n=>n>0)).length;
 return {count:boxes.length,weightLb,volumeIn3,volumeFt3:volumeIn3/1728,volumeM3:volumeIn3*0.000016387064,missingDimensions};
}
