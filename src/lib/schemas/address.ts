import { z } from "zod";

export const mexicanAddressSchema = z.object({
  street: z.string().trim().min(2, "Escribe la calle."),
  exteriorNumber: z.string().trim().min(1, "Escribe el número exterior."),
  interiorNumber: z.string().trim().optional(),
  neighborhood: z.string().trim().min(2, "Escribe la colonia."),
  postalCode: z.string().regex(/^\d{5}$/, "El código postal debe tener 5 dígitos."),
  municipality: z.string().trim().min(2, "Escribe el municipio o alcaldía."),
  state: z.string().trim().min(2, "Selecciona el estado."),
  references: z.string().trim().max(300).optional(),
});

export const mexicanPhoneSchema = z.string().trim().transform(value => value.replace(/[\s().-]/g, "")).pipe(z.string().regex(/^\+?\d{7,15}$/, "Escribe entre 7 y 15 dígitos; puedes incluir el prefijo internacional."));
export const rfcSchema = z.string().trim().toUpperCase().regex(/^[A-ZÑ&]{3,4}\d{6}[A-Z0-9]{3}$/, "Escribe un RFC válido.").optional().or(z.literal(""));
