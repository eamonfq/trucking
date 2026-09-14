import { z } from "zod";
import { categoryIdSchema } from "@/lib/config/category-schema";

export const receptionSchema = z.object({ recipientId:z.string().optional(), originWarehouseId:z.string().optional(), billingMode:z.enum(["peso","fijo","manual"]).optional(), customPriceUsd: z.coerce.number().finite().positive().max(100000).multipleOf(0.01).optional(), invoiceNow: z.boolean().optional(), prealertId: z.string().optional(), customer: z.string().min(1, "Selecciona un cliente."), length: z.coerce.number().positive("Escribe el largo."), width: z.coerce.number().positive("Escribe el ancho."), height: z.coerce.number().positive("Escribe el alto."), weightLb: z.coerce.number().positive("Escribe el peso."), overrideCategory: z.string().optional(), overrideReason: z.string().optional(), rejectionReason: z.string().optional(), reject: z.boolean().default(false), photoName: z.string().optional() }).superRefine((data, context) => {
  if (data.overrideCategory && (data.overrideReason?.trim().length ?? 0) < 5) context.addIssue({ code: "custom", path: ["overrideReason"], message: "Explica el motivo de la sobrescritura." });
  if (data.reject && (data.rejectionReason?.trim().length ?? 0) < 5) context.addIssue({ code: "custom", path: ["rejectionReason"], message: "Indica por qué se rechaza la caja." });
});

export const truckSchema = z.object({
  plate: z.string().trim().toUpperCase().regex(/^[A-Z0-9]{2,4}-[A-Z0-9]{2,4}$/, "Usa un formato como FLA-2604."),
  driverId: z.string().min(1, "Selecciona un chofer."),
  newDriverName: z.string().trim().optional(),
  newDriverPhone: z.string().trim().optional(),
  newDriverLicense: z.string().trim().optional(),
  departureDate: z.string().min(1, "Selecciona la fecha de salida.").refine((value) => new Date(`${value}T23:59:59`).getTime() >= Date.now(), "La fecha de salida no puede estar en el pasado."),
  destinationCity: z.string().trim().min(2).max(80),
  maxWeightLb: z.preprocess(v=>v===""||v===null?undefined:v,z.coerce.number().finite().positive().max(1000000).optional()),
  capacity: z.record(categoryIdSchema, z.coerce.number().int().min(0).max(999)).default({}),
  notes: z.string().trim().max(500, "Las notas no pueden superar 500 caracteres.").optional(),
}).superRefine((value, context) => {
  if (value.driverId !== "new") return;
  if (!value.newDriverName || value.newDriverName.length < 3) context.addIssue({ code: "custom", path: ["newDriverName"], message: "Escribe el nombre completo del chofer." });
  if (!/^\+?\d{10,15}$/.test(value.newDriverPhone ?? "")) context.addIssue({ code: "custom", path: ["newDriverPhone"], message: "Escribe un teléfono válido." });
  if ((value.newDriverLicense?.length ?? 0) < 5) context.addIssue({ code: "custom", path: ["newDriverLicense"], message: "Escribe una licencia válida." });
});

export type TruckInput = z.infer<typeof truckSchema>;
