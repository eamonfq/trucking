/**
 * Etiquetas de dominio que se calculan fuera de los componentes (`src/lib/utils/*`) y se usan en
 * varias áreas: pesos, piezas, conceptos de recepción. Clave: español; valor: inglés.
 */
export const domain = {
  "Peso no registrado": "Weight not recorded",
  "{total} lb conjuntas / {pieces} piezas · sin pesaje individual": "{total} lb combined / {pieces} pieces · not weighed individually",
  "{weight} lb": "{weight} lb",
  "Piezas con peso conjunto": "Pieces with combined weight",
  "Paquete": "Package",
  // Ruta de camión guardada sin almacén de origen (admin-actions.ts, warehouse-actions.ts)
  "Origen por confirmar": "Origin to be confirmed",
  // Categorías que genera el código y se guardan en la caja
  "Paquete por peso": "Package by weight",
  "Paquete por volumen": "Package by volume",
  "Carga personalizada": "Custom cargo",
  "{known} lb conocidas · {pending} piezas pendientes de pesar": "{known} lb known · {pending} pieces still to be weighed",
  "{weight} lb · {pieces} piezas con pesaje individual": "{weight} lb · {pieces} pieces weighed individually",
  // Listas de recepciones (src/components/ui/reception-list.tsx y operational-reception-list.tsx)
  "Recepción · 1 pieza": "Receipt · 1 piece",
  "Recepción · {count} piezas": "Receipt · {count} pieces",
  " visibles de {total}": " shown of {total}",
  "Pieza {index}/{total}": "Piece {index}/{total}",
  "Ver {count} piezas y sus estados": "View {count} pieces and their statuses",
  "{name} · 1 piezas": "{name} · 1 piece",
  "{name} · {count} piezas": "{name} · {count} pieces",
  "Ver piezas, contactos y descarga": "View pieces, contacts and download",
} as const;
