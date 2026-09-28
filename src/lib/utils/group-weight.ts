import {calculateBilling,type BillingMode,type WeightPricing} from './billing';
/** Integer units with deterministic remainder: allocated units always equal the measured total. */
export function allocateUnits(total:number,count:number,scale=100){
 if(!Number.isFinite(total)||total<=0||!Number.isInteger(count)||count<1||count>50)throw new Error('Revisa el total y la cantidad de piezas.');
 const units=Math.round(total*scale),base=Math.floor(units/count),rest=units%count;
 if(base<1)throw new Error('El total es demasiado pequeño para la cantidad de piezas.');
 return Array.from({length:count},(_,i)=>(base+(i<rest?1:0))/scale);
}
export function quoteGroupWeight(totalWeightLb:number,count:number,mode:BillingMode,settings:WeightPricing,manualTotal=0){
 if(!['peso-real','peso-personalizado','manual'].includes(mode))throw new Error('El peso conjunto se admite en cobro por peso o carga especial.');
 const weights=allocateUnits(totalWeightLb,count,1000);
 const billing=calculateBilling(mode,{length:0,width:0,height:0},totalWeightLb,settings,manualTotal);
 return {weights,billing,amounts:allocateUnits(billing.amountUsd,count)};
}
