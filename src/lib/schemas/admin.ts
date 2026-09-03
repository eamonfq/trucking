import { z } from "zod";

export const receptionSchema = z.object({ customer: z.string().min(1), length: z.coerce.number().positive(), width: z.coerce.number().positive(), height: z.coerce.number().positive(), weightLb: z.coerce.number().positive(), overrideCategory: z.string().optional(), overrideReason: z.string().optional(), photoName: z.string().optional() }).refine((data) => !data.overrideCategory || (data.overrideReason?.length ?? 0) >= 5, { path: ["overrideReason"], message: "Explica el motivo de la sobrescritura." });
export const truckSchema = z.object({ plate: z.string().min(3), driverName: z.string().min(3), departureDate: z.string().min(1), route: z.string().min(3) });
