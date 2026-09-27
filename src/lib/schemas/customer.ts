import { z } from "zod";
import { mexicanAddressSchema, mexicanPhoneSchema, rfcSchema } from "@/lib/schemas/address";
import {optionalEmailSchema,optionalAddressSchema} from "./optional-contact";

export const customerProfileSchema = z.object({
  firstName: z.string().trim().min(2, "Escribe el nombre."),
  paternalLastName: z.string().trim().min(2, "Escribe el apellido paterno."),
  maternalLastName: z.string().trim().optional(),
  email: optionalEmailSchema,
  phone: mexicanPhoneSchema,
  rfc: rfcSchema,
});

export const lockerCodeSchema = z.string().trim().toUpperCase().regex(/^AL-MX-\d{4}$/, "Usa el formato AL-MX-0000.");
export const internalNoteSchema = z.object({ body: z.string().trim().min(5, "Escribe al menos 5 caracteres.").max(500, "La nota no puede exceder 500 caracteres.") });
export const customerAddressSchema = mexicanAddressSchema.extend({ label: z.string().trim().min(2, "Escribe un nombre para identificar la dirección.") });
export const customerRecipientSchema = z.object({
  name: z.string().trim().min(3, "Escribe el nombre completo."),
  phone: mexicanPhoneSchema,
  addressId: z.string().min(1, "Selecciona una dirección."),
});
export const administrativeAddressSchema = optionalAddressSchema.extend({label:z.string().trim().min(2,"Escribe un nombre para identificar la dirección.")});
export const administrativeRecipientSchema = customerRecipientSchema.extend({addressId:z.string().trim()});

export type CustomerProfileInput = z.infer<typeof customerProfileSchema>;
export type CustomerAddressInput = z.infer<typeof customerAddressSchema>;
export type CustomerRecipientInput = z.infer<typeof customerRecipientSchema>;

/** Alta rápida en recepción: datos de contacto y dirección, sin contraseña. */
export const quickCustomerSchema = customerProfileSchema.and(optionalAddressSchema).and(z.object({recipients:z.array(customerRecipientSchema.omit({addressId:true})).max(100).optional()}));
export type QuickCustomerInput = z.infer<typeof quickCustomerSchema>;
