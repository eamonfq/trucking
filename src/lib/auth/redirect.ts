import type { Role } from "@/lib/types";

const HOME: Record<Role, string> = { admin: "/admin", cliente: "/cliente" };

/**
 * Destino después de iniciar sesión. El parámetro `siguiente` solo se respeta si
 * el rol puede entrar a esa ruta: el middleware rebota lo demás y el usuario
 * quedaría rebotando entre login y la ruta protegida.
 */
export function resolvePostLoginPath(role: Role, requested?: string | null) {
  const home = HOME[role];
  if (!requested) return home;
  // "//evil.com" también empieza por "/" y saldría del sitio.
  if (!requested.startsWith("/") || requested.startsWith("//")) return home;
  return requested === home || requested.startsWith(`${home}/`) ? requested : home;
}
