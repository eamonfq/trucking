import { z } from "zod";
import { mexicanPhoneSchema } from "./address";

export const loginSchema = z.object({
  identifier: z.string().trim().min(1, "Escribe tu correo o número de casillero.").max(254),
  password: z.string().min(8, "La contraseña debe tener al menos 8 caracteres.").max(128),
  remember: z.boolean().default(false),
});

export const passwordSchema = z
  .string()
  .min(8, "Usa al menos 8 caracteres.")
  .max(128, "Usa como máximo 128 caracteres.")
  .regex(/[A-Z]/, "Incluye una mayúscula.")
  .regex(/[a-z]/, "Incluye una minúscula.")
  .regex(/\d/, "Incluye un número.");

export const accountRegistrationSchema = z.object({
  firstName: z.string().trim().min(2, "Escribe tu nombre."),
  paternalLastName: z.string().trim().min(2, "Escribe tu apellido paterno."),
  maternalLastName: z.string().trim().optional(),
  email: z.email("Escribe un correo válido."),
  phone: mexicanPhoneSchema,
  password: passwordSchema,
  confirmPassword: z.string(),
  acceptedTerms: z.boolean().refine(Boolean, "Debes aceptar los términos."),
}).refine((data) => data.password === data.confirmPassword, { path: ["confirmPassword"], message: "Las contraseñas no coinciden." });

export const resetRequestSchema = z.object({ email: z.email("Escribe un correo válido.") });
export const resetPasswordSchema = z.object({ password: passwordSchema, confirmPassword: z.string() }).refine((data) => data.password === data.confirmPassword, { path: ["confirmPassword"], message: "Las contraseñas no coinciden." });
export const changePasswordSchema = z.object({ currentPassword: z.string().min(8), password: passwordSchema, confirmPassword: z.string() }).refine((data) => data.password === data.confirmPassword, { path: ["confirmPassword"], message: "Las contraseñas no coinciden." });
