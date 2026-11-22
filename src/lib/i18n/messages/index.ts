import { authMessages } from "../catalogs/auth";
import { validation } from "../catalogs/validation";
import { adminMessages } from "./admin";
import { clientMessages } from "./client";
import { customerMessages } from "./customers";
import { receptionMessages } from "./reception";
import { truckMessages } from "./trucks";

/**
 * Todos los mensajes que el servidor devuelve a la interfaz. Solo se importa desde código de
 * servidor (`runMutation`), así no viaja al navegador.
 */
export const serverMessages = {
  ...authMessages,
  ...validation,
  ...clientMessages,
  ...receptionMessages,
  ...customerMessages,
  ...truckMessages,
  ...adminMessages,
} as const;
