import { authMessages } from "./auth";
import { validation } from "./validation";

/** Errores de validación que muestran `Input`, `Select` y `Textarea`: se traducen solos. */
export const fieldMessages = { ...authMessages, ...validation } as const;
