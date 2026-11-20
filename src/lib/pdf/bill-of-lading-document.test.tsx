// @vitest-environment node
import React from "react";
import { it, expect, vi } from "vitest";
import { renderToBuffer } from "@react-pdf/renderer";
import { mkdir, writeFile } from "node:fs/promises";
import { BillOfLadingDocument } from "./bill-of-lading-document";
import { billOfLadingSchema } from "@/lib/schemas/bill-of-lading";
vi.stubGlobal("React", React);

/** Fictitious data shaped like the client's paper BOL: boxes on one line, each vehicle on its own line. */
const sample = billOfLadingSchema.parse({
  date: "2026-09-12", number: "BOL-EJEMPLO", sidNumber: "BOL-EJEMPLO",
  shipFrom: "100 Example Rd\nSpringfield, IL 60000", shipTo: "200 Sample Dr\nEl Paso, TX 79900", billTo: "EXAMPLE SALES INC\n200 Sample Dr\nEl Paso, TX 79900",
  carrierName: "A&L TRUCKING LOGISTICS", trailerNumber: "01", scac: "XXXX",
  specialInstructions: "HANDLE WITH CARE\nSHIPMENT CONSISTS OF 222 BOXES OF USED HOUSEHOLD GOODS AND 3 USED RECREATIONAL VEHICLES. VEHICLES SECURED FOR TRANSPORT.",
  freightTerms: "prepaid",
  orders: [{ id: "o1", orderNumber: "BOL-EJEMPLO", packages: 225, weightLb: 10373, palletSlip: "Y", info: "MIXED SHIPMENT: 222 BOXES OF USED HOUSEHOLD GOODS AND PERSONAL EFFECTS, PLUS 3 USED RECREATIONAL VEHICLES. ALL ITEMS ARE USED." }],
  lines: [
    { id: "l1", packageQty: 222, packageType: "BOXES", weightLb: 8847, description: "Non-hazardous Household Goods" },
    { id: "l2", packageQty: 1, packageType: "ATV", weightLb: 870, description: "Non-hazardous 2023 Used ATV 600 Gasoline", nmfc: "190450" },
    { id: "l3", packageQty: 1, packageType: "Motorcycle", weightLb: 234, description: "Non-hazardous 2013 Used Motorcycle 250cc Gasoline", nmfc: "190290" },
    { id: "l4", packageQty: 1, packageType: "ATV", weightLb: 422, description: "Non-hazardous 2018 Used ATV 700 Gasoline", nmfc: "190450" },
  ],
  declaredValue: "N/A", declaredValuePer: "N/A", codFeeTerms: "prepaid",
  shipperSignature: "Shipper Example", shipperSignatureDate: "2026-09-12", carrierSignature: "Carrier Example", carrierSignatureDate: "2026-09-12",
  trailerLoaded: "driver", freightCounted: "driver-pieces",
});

it("renders the client's short-form layout with the saved values only", async () => {
  const tree = JSON.stringify(BillOfLadingDocument({ bill: sample }));
  for (const text of ["BILL OF LADING – SHORT FORM – NOT NEGOTIABLE", "Special Instructions:", "HANDLE WITH CARE", "CUSTOMER ORDER INFORMATION", "CARRIER INFORMATION", "222", "BOXES", "09/12/2026"]) expect(tree).toContain(text);
  const bytes = await renderToBuffer(BillOfLadingDocument({ bill: sample }));
  expect(bytes.subarray(0, 4).toString()).toBe("%PDF");
  if (process.env.BOL_QA) { await mkdir(process.env.BOL_QA, { recursive: true }); await writeFile(`${process.env.BOL_QA}/bill-of-lading-muestra.pdf`, bytes); }
}, 20000);

it("paginates a long cargo list instead of cutting rows", async () => {
  const long = billOfLadingSchema.parse({ ...sample, lines: Array.from({ length: 45 }, (_, i) => ({ id: `l${i}`, packageQty: 1, packageType: "VEHICLE", weightLb: 500, description: `Vehicle ${i + 1} VIN 0000${i}` })) });
  const bytes = await renderToBuffer(BillOfLadingDocument({ bill: long }));
  expect(bytes.subarray(0, 4).toString()).toBe("%PDF");
  expect(bytes.toString("latin1").match(/\/Type \/Page\b/g)?.length).toBeGreaterThan(1);
  if (process.env.BOL_QA) await writeFile(`${process.env.BOL_QA}/bill-of-lading-largo.pdf`, bytes);
}, 20000);
