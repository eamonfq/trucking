/** Eliminar registros de prueba (`/admin/eliminar` y `src/components/admin/deletion-manager.tsx`). Clave: español; valor: inglés. */
export const adminDeletion = {
  // Página
  "Administración completa": "Full administration",
  "Eliminar registros de prueba": "Delete test records",
  "Revisa el alcance antes de confirmar. Las unidades de una recepción y sus documentos vinculados se gestionan juntas.": "Review the scope before confirming. A receipt's units and their linked documents are handled together.",
  // Gestor
  "No se pudo consultar el alcance. Revisa tu conexión y acceso.": "Couldn't check the scope. Check your connection and access.",
  "No se confirmó la eliminación. Actualiza la lista antes de volver a intentarlo.": "The deletion wasn't confirmed. Refresh the list before trying again.",
  "Exclusivo del administrador completo. No borra cargos de Clover ni ejecuta reembolsos. Se conserva respaldo de auditoría; los archivos asociados dejan de estar disponibles. Para eliminar un usuario, retira primero sus órdenes.": "Full administrators only. It doesn't delete Clover charges or issue refunds. An audit backup is kept; the associated files stop being available. To delete a user, remove their orders first.",
  "Órdenes y recepciones": "Orders and receipts",
  "Usuarios": "Users",
  "Buscar registro": "Search records",
  "Código, nombre o correo": "Code, name or email",
  "Revisar eliminación": "Review deletion",
  "No hay registros con estos filtros.": "No records match these filters.",
  "{count} registros · Página {page} de {pages}": "{count} records · Page {page} of {pages}",
  "1 registros · Página {page} de {pages}": "1 record · Page {page} of {pages}",
  "Anterior": "Previous",
  "Siguiente": "Next",
  "Revisando relaciones…": "Checking relationships…",
  "Paquetes": "Packages",
  "Facturas": "Invoices",
  "Envíos": "Shipments",
  "Camiones afectados": "Affected trucks",
  "Incluye {count} factura(s) marcada(s) pagada(s). Solo confirma si los pagos también son de prueba. No se devolverá dinero.": "Includes {count} invoice(s) marked as paid. Only confirm if the payments are test data too. No money will be refunded.",
  "Motivo de la eliminación": "Reason for deletion",
  "Confirmo que estos registros son datos de prueba y revisé los documentos relacionados.": "I confirm these records are test data and I reviewed the related documents.",
  "Escribe ELIMINAR para confirmar": "Type ELIMINAR to confirm",
  "Cancelar": "Cancel",
  "Eliminar registros": "Delete records",
} as const;

/**
 * Mensajes de `src/lib/auth/deletion-actions.ts`. `previewDeletion` no pasa por `runMutation`, así que
 * el gestor los traduce al mostrarlos; `messages/admin.ts` los incluye para `deleteTestRecord`.
 */
export const adminDeletionActionMessages = {
  "El registro ya no existe.": "The record no longer exists.",
  "No puedes eliminar tu propia cuenta.": "You can't delete your own account.",
  "Debe conservarse un administrador completo activo.": "An active full administrator must remain.",
  "Este usuario tiene operaciones. Elimina primero sus órdenes desde esta sección.": "This user has operations. Delete their orders from this section first.",
  "Hay registros vinculados a Clover. No se pueden borrar desde la limpieza de pruebas; conserva el historial del proveedor.": "Some records are linked to Clover. They can't be deleted from the test cleanup; keep the provider's history.",
  "Las relaciones incluyen a varios clientes. Revisa los vínculos antes de eliminar.": "The relationships include more than one customer. Review the links before deleting.",
  "Selecciona un registro.": "Select a record.",
  "No se pudo preparar la eliminación.": "The deletion couldn't be prepared.",
  "Confirma que son pruebas, escribe ELIMINAR y explica el motivo.": "Confirm that they're test data, type ELIMINAR and explain the reason.",
  "No se puede eliminar.": "It can't be deleted.",
  "Los registros cambiaron. Consulta nuevamente la vista previa antes de eliminar.": "The records changed. Check the preview again before deleting.",
  "Registro retirado del sistema operativo. Se conservó un respaldo de auditoría; no se realizaron reembolsos ni borrados externos.": "Record removed from the operating system. An audit backup was kept; no refunds or external deletions were made.",
} as const;

/** Nombre y detalle de cada fila de `getDeletionDirectory`, generados en español por el código. */
const adminDeletionDirectory = {
  "{count} unidad(es) · {status}": "{count} unit(s) · {status}",
  "Cliente": "Customer",
  "Operador de almacén": "Warehouse operator",
  "Administrativo": "Administrative",
} as const;

/** Todo lo que el gestor traduce en tiempo de ejecución. */
export const adminDeletionMessages = { ...adminDeletionActionMessages, ...adminDeletionDirectory } as const;
