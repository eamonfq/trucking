import type { ClientUser, User } from "@/lib/types";

/** Proyección que se puede enviar al navegador del cliente: deja fuera las notas internas del equipo operativo. */
export function toClientUser(user: User): ClientUser {
  const { id, role, firstName, paternalLastName, maternalLastName, email, phone, lockerCode, rfc, active, activity } = user;
  return { ...(role === "operador" ? {warehouseGrants:structuredClone(user.warehouseGrants??[])} : {}), id, role, firstName, paternalLastName, maternalLastName, email, phone, lockerCode, rfc, active, activity: structuredClone(activity) };
}
