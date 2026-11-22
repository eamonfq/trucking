import type { Dimensions } from '@/lib/config/box-categories';
import { LANGUAGE_TAG, type Locale } from '@/lib/i18n/config';
export const formatDimensions = (dimensions: Dimensions, locale: Locale = "es") => Object.values(dimensions).every(n=>n>0) ? `${dimensions.length} × ${dimensions.width} × ${dimensions.height} in` : locale === "en" ? 'Not recorded' : 'No registradas';
export const formatUsd = (amount: number) => `$${new Intl.NumberFormat("en-US", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
}).format(amount)} USD`;

export const formatDate = (value: string | Date, locale: Locale = "es") =>
  new Intl.DateTimeFormat(LANGUAGE_TAG[locale], {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(value));

export const formatDateTime = (value: string | Date, locale: Locale = "es") =>
  new Intl.DateTimeFormat(LANGUAGE_TAG[locale], {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "UTC",
  }).format(new Date(value));
