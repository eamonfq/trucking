import { BOX_CATEGORIES, type BoxCategory, type Dimensions } from "@/lib/config/box-categories";

type UpgradeReason = "peso" | "medida" | "peso-y-medida" | null;

export type CategorySuggestion = {
  category: BoxCategory | null;
  upgradedByWeight: boolean;
  upgradedByDimensions: boolean;
  reason: UpgradeReason;
};

const sortedDimensions = (dimensions: Dimensions) =>
  [dimensions.length, dimensions.width, dimensions.height].sort((a, b) => a - b);

const dimensionsFit = (actual: Dimensions, limit: Dimensions) => {
  const box = sortedDimensions(actual);
  const category = sortedDimensions(limit);
  return box.every((value, index) => value <= category[index]);
};

export function suggestCategory(dimensions: Dimensions, weightLb: number): CategorySuggestion {
  const dimensionIndex = BOX_CATEGORIES.findIndex((category) => dimensionsFit(dimensions, category.dimensions));
  const weightIndex = BOX_CATEGORIES.findIndex((category) => weightLb <= category.maxWeightLb);
  const categoryIndex = BOX_CATEGORIES.findIndex(
    (category) => dimensionsFit(dimensions, category.dimensions) && weightLb <= category.maxWeightLb,
  );

  if (categoryIndex === -1) {
    const weightFails = weightIndex === -1 || (dimensionIndex >= 0 && weightIndex > dimensionIndex);
    const dimensionFails = dimensionIndex === -1 || (weightIndex >= 0 && dimensionIndex > weightIndex);
    return {
      category: null,
      upgradedByWeight: weightFails,
      upgradedByDimensions: dimensionFails,
      reason: weightFails && dimensionFails ? "peso-y-medida" : weightFails ? "peso" : "medida",
    };
  }

  const upgradedByWeight = dimensionIndex >= 0 && categoryIndex > dimensionIndex;
  const upgradedByDimensions = weightIndex >= 0 && categoryIndex > weightIndex;
  return {
    category: BOX_CATEGORIES[categoryIndex] ?? null,
    upgradedByWeight,
    upgradedByDimensions,
    reason: upgradedByWeight && upgradedByDimensions ? "peso-y-medida" : upgradedByWeight ? "peso" : upgradedByDimensions ? "medida" : null,
  };
}
