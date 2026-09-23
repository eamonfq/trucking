import type { Dimensions } from '@/lib/config/box-categories';

export const DEFAULT_WEIGHT_PRICING = { pricePerLbUsd: 3.2, dimensionalBase: 1000, dimensionalFactor: 19 };
export type WeightPricing = typeof DEFAULT_WEIGHT_PRICING;
// Preserve 'peso' for historical greater-of-real-and-dimensional snapshots.
export type BillingMode = 'peso' | 'peso-real' | 'volumen' | 'fijo' | 'manual';
export type BillingSnapshot = WeightPricing & {
  volumePricing?: 'direct-usd' | 'dimensional-lb';
  mode: BillingMode; dimensions: Dimensions; actualWeightLb: number;
  dimensionalWeightLb: number; billableWeightLb: number; amountUsd: number;
};
export function calculateBilling(mode: BillingMode, dimensions: Dimensions, actualWeightLb: number, settings: WeightPricing, fixedPriceUsd = 0, volumePricing: 'direct-usd' | 'dimensional-lb' = 'direct-usd'): BillingSnapshot {
  const measures = [dimensions.length, dimensions.width, dimensions.height];
  if ([...measures, actualWeightLb].some(value => !Number.isFinite(value) || value < 0) || [settings.pricePerLbUsd, settings.dimensionalBase, settings.dimensionalFactor].some(value => !Number.isFinite(value) || value <= 0)) throw new Error('Revisa las medidas, el peso y los factores.');
  if (['peso', 'volumen', 'fijo'].includes(mode) && measures.some(value => value <= 0)) throw new Error('Completa las tres medidas.');
  if (mode !== 'volumen' && actualWeightLb <= 0) throw new Error('Escribe el peso real.');
  const dimensionalResult = dimensions.length * dimensions.width * dimensions.height / settings.dimensionalBase * settings.dimensionalFactor;
  const directVolume = mode === 'volumen' && volumePricing === 'direct-usd';
  const dimensionalWeightLb = directVolume ? 0 : dimensionalResult;
  const weight = mode === 'peso-real' ? actualWeightLb : mode === 'volumen' ? dimensionalWeightLb : Math.max(actualWeightLb, dimensionalWeightLb);
  // Remove floating-point noise at exact integer boundaries, without rounding displayed weight first.
  const billableWeightLb = directVolume ? 0 : Math.ceil(weight - Number.EPSILON * Math.max(1, weight) * 4);
  const amountUsd = Math.round((directVolume ? dimensionalResult : ['peso', 'peso-real', 'volumen'].includes(mode) ? billableWeightLb * settings.pricePerLbUsd : fixedPriceUsd) * 100) / 100;
  if (!Number.isFinite(amountUsd) || amountUsd <= 0 || amountUsd > 100000000) throw new Error('Revisa el importe del cobro.');
  return { ...(mode === 'volumen' ? {volumePricing} : {}), pricePerLbUsd:settings.pricePerLbUsd, dimensionalBase:settings.dimensionalBase, dimensionalFactor:settings.dimensionalFactor, mode, dimensions: {...dimensions}, actualWeightLb, dimensionalWeightLb, billableWeightLb, amountUsd };
}
export function billingDescription(billing: BillingSnapshot) {
  if (billing.mode === 'volumen' && billing.volumePricing === 'direct-usd') return `Volumen · (${billing.dimensions.length} × ${billing.dimensions.width} × ${billing.dimensions.height} in ÷ ${billing.dimensionalBase}) × ${billing.dimensionalFactor} = USD ${billing.amountUsd.toFixed(2)} · peso real informativo ${billing.actualWeightLb} lb`;
  if (billing.mode === 'peso-real') return `Peso real ${billing.actualWeightLb} lb · cobro ${billing.billableWeightLb} lb × USD ${billing.pricePerLbUsd.toFixed(2)}`;
  if (billing.mode === 'volumen') return `Volumen · peso dimensional ${billing.dimensionalWeightLb.toFixed(2)} lb · cobro ${billing.billableWeightLb} lb × USD ${billing.pricePerLbUsd.toFixed(2)} · peso real informativo ${billing.actualWeightLb} lb`;
  return billing.mode === 'peso' ? `Peso real ${billing.actualWeightLb} lb · dimensional ${billing.dimensionalWeightLb.toFixed(2)} lb · cobro ${billing.billableWeightLb} lb × USD ${billing.pricePerLbUsd.toFixed(2)}` : billing.mode === 'manual' ? 'Cotización manual acordada' : 'Precio fijo';
}
