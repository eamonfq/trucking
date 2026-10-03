import {expect,it} from 'vitest';
import {boxWeightLabel,groupReceptions,receptionConceptSummaries} from './reception-display';
import type {Box} from '@/lib/types';
const base:Box={id:'b',userId:'customer',code:'BX-001',categoryId:'custom',status:'en-bodega',weightLb:23.4,dimensions:{length:0,width:0,height:0},timeline:[]};
it('groups only the same reception and customer, not all parcels owned by one customer',()=>{
 const receipt={id:'reception',code:'BX-GROUP',index:1,total:2};
 const grouped=groupReceptions([{...base,receptionGroup:receipt},{...base,id:'b2',receptionGroup:{...receipt,index:2}},{...base,id:'other'},{...base,id:'other-customer',userId:'different',receptionGroup:receipt}]);
 expect(grouped.map(group=>group.boxes.length)).toEqual([2,1,1]);
});
it('never presents allocated group weight as a physical individual weighing',()=>{
 expect(boxWeightLabel({...base,billing:{mode:'manual',amountUsd:74.88,groupWeight:{totalWeightLb:117,pieces:5,totalAmountUsd:374.4}} as Box['billing']})).toContain('117 lb conjuntas / 5 piezas');
 expect(boxWeightLabel({...base,weightUnknown:true})).toBe('Peso no registrado');
});
it('sums known weights while keeping pending measurements explicit',()=>{
 const concept={id:'manual',description:'Artículos especiales',quantity:2,mode:'manual' as const,weightScope:'iguales' as const,totalWeightLb:25,totalAmountUsd:200,weightUnknown:true};
 const result=receptionConceptSummaries([{...base,weightLb:25,customPriceUsd:100,receptionConcept:concept},{...base,id:'b2',weightLb:0,weightUnknown:true,customPriceUsd:100,receptionConcept:concept}]);
 expect(result).toHaveLength(1);expect(result[0]).toMatchObject({count:2,amountUsd:200,weight:'25 lb conocidas · 1 piezas pendientes de pesar'});
});
