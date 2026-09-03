import { BOX_CATEGORIES } from "@/lib/config/box-categories";
import { INVOICE_STATUSES, type Invoice } from "@/lib/types";

export const invoices: Invoice[] = Array.from({ length: 10 }, (_, index) => {
  const category = BOX_CATEGORIES[index % BOX_CATEGORIES.length]!;
  return {
    id: `inv-${String(index + 1).padStart(3, "0")}`,
    number: `AL-DEMO-${String(index + 1).padStart(4, "0")}`,
    userId: `usr-00${(index % 3) + 1}`,
    shipmentId: `ship-${String((index % 8) + 1).padStart(3, "0")}`,
    status: INVOICE_STATUSES[index % INVOICE_STATUSES.length]!,
    issuedAt: new Date(Date.UTC(2026, 7, 2 + index)).toISOString(),
    dueAt: new Date(Date.UTC(2026, 7, 17 + index)).toISOString(),
    lines: [{ categoryId: category.id, quantity: (index % 3) + 1, unitPriceUsd: category.priceUsd }],
    insuranceUsd: index % 2 === 0 ? 12 : 0,
    homeDeliveryUsd: index % 3 === 0 ? 18 : 0,
    timeline: [{ from: null, to: INVOICE_STATUSES[index % INVOICE_STATUSES.length]!, actor: "Facturación A&L", at: new Date(Date.UTC(2026, 7, 2 + index)).toISOString(), note: "Estado inicial del documento." }],
  } satisfies Invoice;
});
