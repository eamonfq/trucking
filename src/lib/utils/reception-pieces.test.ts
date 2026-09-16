import {expect,it} from 'vitest';
import {resolveReceptionPieces} from './reception-pieces';
it('shares large dimensions without replacing each real weight or manual price',()=>{
 const first={length:16,width:26,height:15,weightLb:55,customPriceUsd:50};
 const pieces=[{length:1,width:1,height:1,weightLb:30,customPriceUsd:20},{length:2,width:2,height:2,weightLb:75,customPriceUsd:90}];
 expect(resolveReceptionPieces(first,pieces,{dimensions:true,weight:false,price:false})).toEqual([{...first,weightLb:30,customPriceUsd:20},{...first,weightLb:75,customPriceUsd:90}]);
 expect(resolveReceptionPieces(first,pieces,{dimensions:false,weight:true,price:true})).toEqual(pieces.map(p=>({...p,weightLb:55,customPriceUsd:50})));
 expect(pieces[0].weightLb).toBe(30);
});
