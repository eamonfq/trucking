import type { BoxCategoryId } from "@/lib/config/box-categories";

export const OPERATION_ORIGIN = "Miami, FL";

export const DESTINATION_CITIES = [
  "Ciudad de México",
  "Guadalajara",
  "Monterrey",
  "Puebla",
  "Querétaro",
  "Toluca",
] as const;

export const DEFAULT_TRUCK_CAPACITY: Record<BoxCategoryId, number> = {
  small: 12,
  medium: 12,
  large: 10,
  "x-large": 8,
  cubo: 6,
};
