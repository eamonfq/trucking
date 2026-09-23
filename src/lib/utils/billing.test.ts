import { describe, it, expect } from 'vitest';
import { calculateBilling, DEFAULT_WEIGHT_PRICING as settings } from './billing';
describe('billing',()=>{
  it('charges only real weight without dimensions and ignores large dimensions',()=>{
    for (const dimensions of [{length:0,width:0,height:0},{length:100,width:100,height:100}]) {
      expect(calculateBilling('peso-real',dimensions,50.2,settings)).toMatchObject({billableWeightLb:51,amountUsd:163.2});
    }
  });
  it('charges volume alone regardless of physical weight, including before weighing',()=>{
    for (const weight of [0,50,500]) for (const pricePerLbUsd of [3.2,10]) expect(calculateBilling('volumen',{length:16,width:26,height:15},weight,{...settings,pricePerLbUsd})).toMatchObject({volumePricing:'direct-usd',billableWeightLb:0,amountUsd:118.56,actualWeightLb:weight});
    expect(()=>calculateBilling('volumen',{length:0,width:26,height:15},50,settings)).toThrow();
  });
  it('rounds volume to cents and retains historical volume pricing when requested',()=>{
    expect(calculateBilling('volumen',{length:1,width:1,height:1},10,settings).amountUsd).toBe(0.02);
    expect(calculateBilling('volumen',{length:16,width:26,height:15},50,settings,0,'dimensional-lb')).toMatchObject({billableWeightLb:119,amountUsd:380.8});
  });
  it('accepts manually quoted loads without dimensions',()=>{
    expect(calculateBilling('manual',{length:0,width:0,height:0},500,settings,321.5).amountUsd).toBe(321.5);
  });
  it('charges the greater weight, rounding up only the final weight',()=>{
    expect(calculateBilling('peso',{length:10,width:10,height:10},50.2,settings)).toMatchObject({dimensionalWeightLb:19,billableWeightLb:51,amountUsd:163.2});
    expect(calculateBilling('peso',{length:20,width:20,height:20},50,settings)).toMatchObject({dimensionalWeightLb:152,billableWeightLb:152,amountUsd:486.4});
    expect(calculateBilling('peso',{length:10,width:10,height:10},50,settings).billableWeightLb).toBe(50);
  });
  it('keeps fixed and manually quoted prices independent of weight',()=>{
    for(const mode of ['fijo','manual'] as const)expect(calculateBilling(mode,{length:30,width:30,height:30},500,settings,321.5).amountUsd).toBe(321.5);
  });
  it('supports configurable factors and rejects invalid values',()=>{
    expect(calculateBilling('peso',{length:10,width:10,height:10},1,{pricePerLbUsd:4,dimensionalBase:100,dimensionalFactor:1}).amountUsd).toBe(40);
    expect(()=>calculateBilling('peso',{length:0,width:1,height:1},1,settings)).toThrow();
    expect(()=>calculateBilling('manual',{length:1,width:1,height:1},1,settings,0)).toThrow();
  });
});
