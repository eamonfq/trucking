import type { Address } from "@/lib/types";

/** The label also covers pickup-only records that have no street address. */
export function formatDeliveryAddress(address?: Pick<Address, "label" | "street" | "exteriorNumber" | "interiorNumber" | "neighborhood" | "postalCode" | "municipality" | "state" | "references"> | null) {
  if (!address || address.label === "Sin dirección") return "";
  const street = [address.street, address.exteriorNumber].filter(Boolean).join(" ");
  const interior = address.interiorNumber ? "int. " + address.interiorNumber : "";
  const postal = address.postalCode ? "C.P. " + address.postalCode : "";
  const location = [street, interior, address.neighborhood, postal, address.municipality, address.state].filter(Boolean);
  if (location.length) {
    const complete = Boolean(address.street && address.exteriorNumber && address.neighborhood && address.postalCode && address.municipality && address.state);
    const label = !complete && address.label !== "Principal" ? address.label : "";
    return [label, ...location, address.references].filter(Boolean).join(", ");
  }
  return [address.label !== "Principal" ? address.label : "", address.references].filter(Boolean).join(" · ");
}
