import { z } from "zod";

export const prealertSchema = z.object({ store: z.string().min(2, "Escribe la tienda."), tracking: z.string().min(5, "Escribe el tracking."), description: z.string().min(3, "Describe el contenido."), declaredValue: z.coerce.number().positive("Escribe un valor mayor a cero."), estimatedCategory: z.string().min(1, "Elige una categoría.") });
export const createShipmentSchema = z.object({ boxIds: z.array(z.string()).min(1, "Selecciona al menos una caja."), recipientId: z.string().min(1, "Selecciona un destinatario."), deliveryMethod: z.enum(["sucursal", "domicilio"]) });
export const recipientSchema = z.object({ name: z.string().min(3, "Escribe el nombre."), phone: z.string().regex(/^\d{10}$/, "Escribe 10 dígitos."), addressId: z.string().min(1, "Elige una dirección.") });
export const paymentReportSchema = z.object({ amount: z.coerce.number().positive(), method: z.string().min(2), reference: z.string().min(3), receiptName: z.string().optional() });
export const supportSchema = z.object({ subject: z.string().min(5), message: z.string().min(10) });
