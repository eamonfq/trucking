import { z } from "zod";

export const prealertSchema = z.object({ store: z.string().min(2, "Escribe la tienda."), tracking: z.string().min(5, "Escribe el tracking."), description: z.string().min(3, "Describe el contenido."), declaredValue: z.coerce.number().positive("Escribe un valor mayor a cero."), estimatedCategory: z.string().min(1, "Elige una categoría.") });
export const createShipmentSchema = z.object({ boxIds: z.array(z.string()).min(1, "Selecciona al menos una caja."), recipientId: z.string().min(1, "Selecciona un destinatario."), deliveryMethod: z.enum(["sucursal", "domicilio"]) });
export const paymentReportSchema = z.object({ amount: z.coerce.number().positive(), method: z.string().min(2), reference: z.string().min(3), receiptName: z.string().optional() });
export const supportSchema = z.object({ subject: z.string().trim().min(5, "Describe el asunto en al menos 5 caracteres."), message: z.string().trim().min(10, "Cuéntanos el detalle en al menos 10 caracteres.") });
export const supportReplySchema = z.object({ message: z.string().trim().min(5, "Escribe al menos 5 caracteres.") });
