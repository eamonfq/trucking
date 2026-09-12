import { z } from "zod";
export const receptionPaymentSchema = z.object({
  method: z.enum(["efectivo", "destino", "tarjeta", "transferencia", "deposito"]),
  warehouseId:z.string().optional(),
  reference: z.string().trim().max(160,"Usa como máximo 160 caracteres.").optional(),
  amount: z.coerce.number().finite().nonnegative().optional(),
}).superRefine((value, ctx) => {
  if (["tarjeta","transferencia","deposito"].includes(value.method) && (!value.amount || Math.abs(Math.round(value.amount * 100) - value.amount * 100) > 0.000001)) {
    ctx.addIssue({ code: "custom", path: ["amount"], message: "Indica un monto positivo con hasta dos decimales." });
  }
});
