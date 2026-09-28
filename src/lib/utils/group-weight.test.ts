import {it,expect} from 'vitest';
import {quoteGroupWeight} from './group-weight';
import {DEFAULT_WEIGHT_PRICING,calculateBilling} from './billing';
it('calculates 726 lb at the agreed rates without changing the default rate',()=>{
 for(const rate of [3.2,3.5,3.7])expect(calculateBilling('peso-personalizado',{length:0,width:0,height:0},726,{...DEFAULT_WEIGHT_PRICING,pricePerLbUsd:rate}).amountUsd).toBe(Math.round(726*rate*100)/100);
 expect(DEFAULT_WEIGHT_PRICING.pricePerLbUsd).toBe(3.2);
});
it('conserves 726 total pounds and 2541 dollars across thirteen pieces',()=>{
 const q=quoteGroupWeight(726,13,'peso-personalizado',{...DEFAULT_WEIGHT_PRICING,pricePerLbUsd:3.5});
 expect(q.weights).toHaveLength(13);expect(q.weights.reduce((s,n)=>s+Math.round(n*1000),0)).toBe(726000);
 expect(q.amounts.reduce((s,n)=>s+Math.round(n*100),0)).toBe(254100);
 expect(q.weights.every(w=>w<56)).toBe(true);
});
it('rounds the measured total once and keeps a manual group quote intact',()=>{
 expect(quoteGroupWeight(726.2,13,'peso-personalizado',{...DEFAULT_WEIGHT_PRICING,pricePerLbUsd:3.5}).billing.amountUsd).toBe(2544.5);
 expect(quoteGroupWeight(726,13,'manual',DEFAULT_WEIGHT_PRICING,2000).amounts.reduce((s,v)=>s+Math.round(v*100),0)).toBe(200000);
 expect(()=>quoteGroupWeight(726,13,'volumen',DEFAULT_WEIGHT_PRICING)).toThrow();
});
