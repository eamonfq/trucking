/**
 * Acceso del operador de almacén (`/almacen`): marco de `(almacen)/layout.tsx` y
 * `origin-inventory.tsx` (mis almacenes de origen). Clave: español; valor: inglés.
 */
export const receptionAlmacen = {
  "Recepción en destino": "Destination receiving",
  "{name} · Almacén": "{name} · Warehouse",
  // origin-inventory.tsx
  "Mis almacenes de origen": "My origin warehouses",
  "Consulta paquetes y contactos autorizados. El alta inicial y la carga al camión se gestionan desde administración; este acceso no muestra cobros ni facturas.": "View packages and authorized contacts. Initial check-in and truck loading are handled from administration; this access doesn't show charges or invoices.",
  "Buscar código o cliente": "Search code or customer",
  "{name} · 1 paquetes": "{name} · 1 package",
  "{name} · {count} paquetes": "{name} · {count} packages",
  "Sin paquetes registrados en este origen.": "No packages recorded at this origin.",
  "Refina la búsqueda: se muestran 100 resultados.": "Refine your search: showing 100 results.",
} as const;
