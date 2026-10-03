import {expect,it} from 'vitest';
import {prepareReceptionConcepts} from './reception-concepts';
import {DEFAULT_WEIGHT_PRICING} from './billing';
import {BOX_CATEGORIES} from '@/lib/config/box-categories';
import {receptionSchema} from '@/lib/schemas/admin';
import {groupReceptions,boxWeightLabel,receptionConceptSummaries} from './reception-display';
import type {Box} from '@/lib/types';
const input=[{id:'moto',description:'Moto Honda · VIN 201285',quantity:1,mode:'manual',priceUsd:3000,weightUnknown:true,weightLb:0},{id:'cajas',description:'Cajas de ropa',quantity:5,mode:'peso-personalizado',weightScope:'grupo',weightLb:117,rateUsd:3.2}];
it('quotes a motorcycle separately from jointly weighed boxes without cross-prorating',()=>{
 const plan=prepareReceptionConcepts(input,DEFAULT_WEIGHT_PRICING,BOX_CATEGORIES);
 expect(plan.count).toBe(6);expect(plan.total).toBe(3374.4);
 expect(plan.rows[0]).toMatchObject({allocatedAmountUsd:3000,item:{weightLb:0,weightUnknown:true},concept:{totalAmountUsd:3000,totalWeightLb:0,quantity:1}});
 expect(plan.rows[0].groupWeight).toBeUndefined();
 expect(plan.rows.slice(1).every(r=>r.item.weightLb===23.4&&r.allocatedAmountUsd===74.88&&r.groupWeight?.pieces===5)).toBe(true);
 expect(plan.rows[1].concept).toMatchObject({totalAmountUsd:374.4,totalWeightLb:117,quantity:5});
 for(const row of plan.rows)expect(receptionSchema.safeParse({customer:'qa',...row.item}).success).toBe(true);
});
it('uses trusted catalog prices and preserves the other charge modalities',()=>{
 const plan=prepareReceptionConcepts([{id:'small',description:'Caja pequeña',quantity:2,mode:'fijo',categoryId:'small',weightScope:'iguales',weightLb:20,priceUsd:1},{id:'volume',description:'Volumen',quantity:1,mode:'volumen',length:16,width:26,height:15,weightLb:80}],DEFAULT_WEIGHT_PRICING,BOX_CATEGORIES);
 expect(plan.rows[0].allocatedAmountUsd).toBe(80);expect(plan.rows[2].allocatedAmountUsd).toBe(118.56);expect(plan.total).toBe(278.56);
});
it('rejects ambiguous scope, duplicate concepts, excessive counts and unknown weight without an agreed quote',()=>{
 for(const bad of [[{...input[1],weightUnknown:true,weightLb:0}], [input[0],input[0]], [{...input[1],quantity:51}], [{...input[1],mode:'fijo',categoryId:'small'}], [{...input[0],priceUsd:0}], [{...input[1],rateUsd:0}]])expect(()=>prepareReceptionConcepts(bad,DEFAULT_WEIGHT_PRICING,BOX_CATEGORIES)).toThrow();
 expect(receptionSchema.safeParse({customer:'qa',billingMode:'manual',customPriceUsd:30,weightLb:0}).success).toBe(false);
 expect(receptionSchema.safeParse({customer:'qa',billingMode:'peso-real',weightUnknown:true,weightLb:0}).success).toBe(false);
});
it('groups receptions rather than customers and never presents allocated weight as an individual measurement',()=>{
 const plan=prepareReceptionConcepts(input,DEFAULT_WEIGHT_PRICING,BOX_CATEGORIES);
 const boxes=plan.rows.map((r,i)=>({id:String(i),userId:'qa',code:`BX-QA-${i}`,receptionGroup:{id:'reception',code:'BX-QA',index:i+1,total:6},receptionConcept:r.concept,contentsNote:r.item.contentsNote,weightLb:r.item.weightLb,weightUnknown:r.item.weightUnknown,billing:{amountUsd:r.allocatedAmountUsd,groupWeight:r.groupWeight}} as Box));
 expect(groupReceptions([...boxes,{...boxes[0],id:'other',receptionGroup:undefined}])).toHaveLength(2);
 expect(receptionConceptSummaries(boxes)).toMatchObject([{count:1,amountUsd:3000,weight:'Peso no registrado'},{count:5,amountUsd:374.4}]);
 expect(boxWeightLabel(boxes[1])).toContain('117 lb conjuntas / 5 piezas');
 expect(boxWeightLabel(boxes[1])).not.toContain('23.4');
});
