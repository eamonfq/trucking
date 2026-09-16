export type ReceptionPiece={length:number;width:number;height:number;weightLb:number;customPriceUsd:number};
export type SharedPieceFields={dimensions:boolean;weight:boolean;price:boolean};
/** Only explicitly shared fields are copied; the real weight is independent by default. */
export function resolveReceptionPieces(first:ReceptionPiece,others:ReceptionPiece[],shared:SharedPieceFields):ReceptionPiece[]{
 return others.map(p=>({...p,...(shared.dimensions?{length:first.length,width:first.width,height:first.height}:{}),...(shared.weight?{weightLb:first.weightLb}:{}),...(shared.price?{customPriceUsd:first.customPriceUsd}:{})}));
}
