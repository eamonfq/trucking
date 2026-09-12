export const BOX_CATEGORY_IDS = ["small", "medium", "large", "x-large", "cubo"] as const;

// Seed identifiers are not the catalog. Runtime categories live in MySQL.
export type BoxCategoryId = string;

export type Dimensions = {
  length: number;
  width: number;
  height: number;
};

export type BoxCategory = {
  active?: boolean;
  id: BoxCategoryId;
  name: string;
  dimensions: Dimensions;
  priceUsd: number;
  maxWeightLb: number;
};

export const BOX_CATEGORIES: readonly BoxCategory[] = [
  {
    id: "small",
    name: "Small",
    dimensions: { length: 10, width: 16, height: 12 },
    priceUsd: 80,
    maxWeightLb: 50,
  },
  {
    id: "medium",
    name: "Medium",
    dimensions: { length: 16, width: 20, height: 15 },
    priceUsd: 110,
    maxWeightLb: 60,
  },
  {
    id: "large",
    name: "Large",
    dimensions: { length: 16, width: 26, height: 15 },
    priceUsd: 180,
    maxWeightLb: 80,
  },
  {
    id: "x-large",
    name: "X Large",
    dimensions: { length: 20, width: 24, height: 20 },
    priceUsd: 230,
    maxWeightLb: 110,
  },
  {
    id: "cubo",
    name: "Cubo",
    dimensions: { length: 24, width: 24, height: 24 },
    priceUsd: 260,
    maxWeightLb: 130,
  },
] as const;

export function getBoxCategory(id: BoxCategoryId) {
  return BOX_CATEGORIES.find((category) => category.id === id);
}
