/**
 * Campos de los formularios de cliente (alta en `customer-manager.tsx`; datos, direcciones y
 * destinatarios en `customer-detail.tsx`). Aparte del resto porque «Estado» aquí es el estado de
 * México y en las tablas es el estatus. Clave: español; valor: inglés.
 */
export const customersForms = {
  "Idioma de correos y facturas": "Language for emails and invoices",
  "Nombre": "First name",
  "Apellido paterno": "Last name",
  "Apellido materno": "Second last name",
  "Correo (opcional)": "Email (optional)",
  "Teléfono": "Phone",
  "RFC opcional": "RFC tax ID (optional)",
  "Calle": "Street",
  "Número exterior": "Street number",
  "Número interior": "Unit number",
  "Código postal": "Postal code",
  "Colonia": "Neighborhood (colonia)",
  "Municipio o alcaldía": "Municipality",
  "Estado": "State",
  "Selecciona": "Select",
  "Referencias": "References",
  "Cancelar": "Cancel",
} as const;
