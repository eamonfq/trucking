import { z } from "zod";

/** Editable content of a Bill of Lading (VICS short form). Every field is optional text the office can correct. */
const text = (max: number) => z.string().trim().max(max, `Máximo ${max} caracteres.`).default("");
const isoDate = z.union([z.literal(""), z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Usa una fecha válida.")]).default("");
const amount = z.preprocess(
  (value) => (value === "" || value === null || value === undefined ? undefined : typeof value === "string" ? Number(value.replace(/,/g, "")) : value),
  z.number({ error: "Escribe un número válido." }).finite("Escribe un número válido.").min(0, "No uses números negativos.").max(10_000_000, "El número es demasiado grande.").optional(),
);

export const billOfLadingLineSchema = z.object({
  id: z.string().min(1).max(80),
  handlingQty: amount,
  handlingType: text(30),
  packageQty: amount,
  packageType: text(30),
  weightLb: amount,
  hazmat: z.boolean().default(false),
  description: text(500),
  nmfc: text(30),
  freightClass: text(20),
});

export const billOfLadingOrderSchema = z.object({
  id: z.string().min(1).max(80),
  orderNumber: text(60),
  packages: amount,
  weightLb: amount,
  palletSlip: z.enum(["", "Y", "N"]).default(""),
  info: text(300),
});

export const billOfLadingSchema = z.object({
  date: isoDate,
  number: text(60),
  shipFrom: text(400),
  sidNumber: text(60),
  shipTo: text(400),
  billTo: text(400),
  carrierName: text(120),
  trailerNumber: text(60),
  serialNumbers: text(120),
  scac: text(10),
  proNumber: text(60),
  specialInstructions: text(2000),
  freightTerms: z.enum(["prepaid", "collect", "third-party"]).default("prepaid"),
  masterBol: z.boolean().default(false),
  orders: z.array(billOfLadingOrderSchema).max(20, "Máximo 20 filas de pedidos.").default([]),
  lines: z.array(billOfLadingLineSchema).max(60, "Máximo 60 filas de carga.").default([]),
  declaredValue: text(40),
  declaredValuePer: text(40),
  codAmount: text(40),
  codFeeTerms: z.enum(["", "collect", "prepaid"]).default(""),
  customerCheckAcceptable: z.boolean().default(false),
  shipperSignature: text(120),
  shipperSignatureDate: isoDate,
  carrierSignature: text(120),
  carrierSignatureDate: isoDate,
  trailerLoaded: z.enum(["", "shipper", "driver"]).default(""),
  freightCounted: z.enum(["", "shipper", "driver-pallets", "driver-pieces"]).default(""),
});

export type BillOfLadingContent = z.output<typeof billOfLadingSchema>;
export type BillOfLadingLine = z.output<typeof billOfLadingLineSchema>;
export type BillOfLadingOrder = z.output<typeof billOfLadingOrderSchema>;

export type BillOfLading = BillOfLadingContent & {
  id: string;
  code: `BOL-${string}`;
  truckId?: string;
  truckCode?: string;
  createdAt: string;
  createdBy: string;
  createdByName: string;
  updatedAt: string;
  updatedBy: string;
  updatedByName: string;
};
