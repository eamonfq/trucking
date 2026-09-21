import type { Dimensions } from '@/lib/config/box-categories';
export const formatDimensions = (dimensions: Dimensions) => Object.values(dimensions).every(n=>n>0) ? `${dimensions.length} × ${dimensions.width} × ${dimensions.height} in` : 'No registradas';
export const formatUsd = (amount: number) => `$${new Intl.NumberFormat("en-US", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
}).format(amount)} USD`;

export const formatDate = (value: string | Date) =>
  new Intl.DateTimeFormat("es-MX", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(value));

export const formatDateTime = (value: string | Date) =>
  new Intl.DateTimeFormat("es-MX", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "UTC",
  }).format(new Date(value));
