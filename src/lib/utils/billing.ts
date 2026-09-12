import type { Dimensions } from '@/lib/config/box-categories';

export const DEFAULT_WEIGHT_PRICING = { pricePerLbUsd: 3.2, dimensionalBase: 1000, dimensionalFactor: 19 };
export type WeightPricing = typeof DEFAULT_WEIGHT_PRICING;
export type BillingMode = 'peso' | 'fijo' | 'manual';
export type BillingSnapshot = WeightPricing & {
  mode: BillingMode; dimensions: Dimensions; actualWeightLb: number;
  dimensionalWeightLb: number; billableWeightLb: number; amountUsd: number;
};
export function calculateBilling(mode: BillingMode, dimensions: Dimensions, actualWeightLb: number, settings: WeightPricing, fixedPriceUsd = 0): BillingSnapshot {
  if ([...Object.values(dimensions), actualWeightLb, settings.pricePerLbUsd, settings.dimensionalBase, settings.dimensionalFactor].some(value => !Number.isFinite(value) || value <= 0)) throw new Error('Medidas, peso y factores deben ser mayores a cero.');
  const dimensionalWeightLb = dimensions.length * dimensions.width * dimensions.height / settings.dimensionalBase * settings.dimensionalFactor;
  const weight = Math.max(actualWeightLb, dimensionalWeightLb);
  // Remove floating-point noise at exact integer boundaries, without rounding displayed weight first.
  const billableWeightLb = Math.ceil(weight - Number.EPSILON * Math.max(1, weight) * 4);
  const amountUsd = Math.round((mode === 'peso' ? billableWeightLb * settings.pricePerLbUsd : fixedPriceUsd) * 100) / 100;
  if (!Number.isFinite(amountUsd) || amountUsd <= 0 || amountUsd > 100000000) throw new Error('Revisa el importe del cobro.');
  return { pricePerLbUsd:settings.pricePerLbUsd, dimensionalBase:settings.dimensionalBase, dimensionalFactor:settings.dimensionalFactor, mode, dimensions: {...dimensions}, actualWeightLb, dimensionalWeightLb, billableWeightLb, amountUsd };
}
export function billingDescription(billing: BillingSnapshot) {
  return billing.mode === 'peso' ? `Peso real ${billing.actualWeightLb} lb · dimensional ${billing.dimensionalWeightLb.toFixed(2)} lb · cobro ${billing.billableWeightLb} lb × USD ${billing.pricePerLbUsd.toFixed(2)}` : billing.mode === 'manual' ? 'Cotización manual acordada' : 'Precio fijo';
}
