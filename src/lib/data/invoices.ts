import { BOX_CATEGORIES } from "@/lib/config/box-categories";
import { INVOICE_STATUSES, type Invoice } from "@/lib/types";

export const invoices: Invoice[] = Array.from({ length: 10 }, (_, index) => {
  const category = BOX_CATEGORIES[index % BOX_CATEGORIES.length]!;
  const status = INVOICE_STATUSES[index % INVOICE_STATUSES.length]!;
  const shipmentIndex = index % 8;
  return {
    id: `inv-${String(index + 1).padStart(3, "0")}`,
    number: `AL-DEMO-${String(index + 1).padStart(4, "0")}`,
    userId: `usr-00${(index % 3) + 1}`,
    shipmentId: `ship-${String((index % 8) + 1).padStart(3, "0")}`,
    boxIds: [`box-${String(shipmentIndex + 9).padStart(3, "0")}`, `box-${String(shipmentIndex + 17).padStart(3, "0")}`],
    status,
    issuedAt: new Date(Date.UTC(2026, 7, 2 + index)).toISOString(),
    dueAt: new Date(Date.UTC(2026, 7, 17 + index)).toISOString(),
    lines: [{ categoryId: category.id, quantity: (index % 3) + 1, unitPriceUsd: category.priceUsd }],
    insuranceUsd: index % 2 === 0 ? 12 : 0,
    homeDeliveryUsd: index % 3 === 0 ? 18 : 0,
    paymentReport: status === "pago-reportado" ? { amountUsd: category.priceUsd * ((index % 3) + 1), method: "Transferencia bancaria", reference: `REF-${2600 + index}`, receiptName: `comprobante-${index + 1}.pdf`, reportedAt: new Date(Date.UTC(2026, 7, 10 + index)).toISOString() } : undefined,
    timeline: [{ from: null, to: status, actor: "Facturación A&L", at: new Date(Date.UTC(2026, 7, 2 + index)).toISOString(), note: "Estado inicial del documento." }],
  } satisfies Invoice;
});
