import { z } from "zod";

export const loginSchema = z.object({
  identifier: z.string().trim().min(1, "Escribe tu correo o número de casillero."),
  password: z.string().min(8, "La contraseña debe tener al menos 8 caracteres."),
  remember: z.boolean().default(false),
});

export const passwordSchema = z
  .string()
  .min(8, "Usa al menos 8 caracteres.")
  .regex(/[A-Z]/, "Incluye una mayúscula.")
  .regex(/[a-z]/, "Incluye una minúscula.")
  .regex(/\d/, "Incluye un número.");
