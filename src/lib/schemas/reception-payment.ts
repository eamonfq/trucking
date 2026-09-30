import { z } from "zod";
export const receptionPaymentSchema = z.object({
  method: z.enum(["efectivo", "destino", "tarjeta", "transferencia", "deposito", "zelle", "cheque", "mixto"]),
  parts:z.array(z.object({method:z.enum(["efectivo","zelle","transferencia","deposito","tarjeta","cheque"]),amount:z.coerce.number().finite().positive().max(100000000).multipleOf(0.01),reference:z.string().trim().max(160).optional()})).min(2).max(5).optional(),
  warehouseId:z.string().optional(),
  reference: z.string().trim().max(160,"Usa como máximo 160 caracteres.").optional(),
  amount: z.coerce.number().finite().nonnegative().optional(),
}).superRefine((value, ctx) => {
  if(value.method==='mixto'&&!value.parts)ctx.addIssue({code:'custom',path:['parts'],message:'Agrega al menos dos pagos.'});
  if (["tarjeta","transferencia","deposito","zelle","cheque"].includes(value.method) && (!value.amount || Math.abs(Math.round(value.amount * 100) - value.amount * 100) > 0.000001)) {
    ctx.addIssue({ code: "custom", path: ["amount"], message: "Indica un monto positivo con hasta dos decimales." });
  }
});
