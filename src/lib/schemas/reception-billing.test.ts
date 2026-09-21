import {expect,it} from 'vitest';
import {receptionSchema} from './admin';
it('allows weight-only and special cargo without dimensions but requires physical weight',()=>{
 for(const billingMode of ['peso-real','manual']){
  expect(receptionSchema.parse({customer:'u',billingMode,weightLb:50,customPriceUsd:100})).toMatchObject({length:0,width:0,height:0,weightLb:50});
  expect(receptionSchema.safeParse({customer:'u',billingMode,weightLb:0}).success).toBe(false);
 }
});
it('requires all dimensions and physical weight to receive volume-priced cargo',()=>{
 const input={customer:'u',billingMode:'volumen',length:16,width:26,height:15,weightLb:500};
 expect(receptionSchema.safeParse(input).success).toBe(true);
 for(const field of ['length','width','height','weightLb']) expect(receptionSchema.safeParse({...input,[field]:0}).success).toBe(false);
});
