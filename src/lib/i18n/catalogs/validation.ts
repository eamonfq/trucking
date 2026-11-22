/**
 * Mensajes de validación de `src/lib/schemas/*` (fuera de acceso y direcciones, que están en
 * `authMessages`). Se usan en el navegador (errores de los campos) y en el servidor.
 * Clave: español; valor: inglés.
 */
export const validation = {
  // admin.ts
  "Escribe el nombre completo del chofer.": "Enter the driver's full name.",
  "Escribe un teléfono válido.": "Enter a valid phone number.",
  "Escribe una licencia válida.": "Enter a valid license number.",
  "Explica el motivo de la sobrescritura.": "Explain the reason for the override.",
  "Indica la tarifa acordada por libra.": "Enter the agreed rate per pound.",
  "Indica por qué se rechaza la caja.": "Explain why the box is being rejected.",
  "La fecha de salida no puede estar en el pasado.": "The departure date can't be in the past.",
  "La nota admite hasta 600 caracteres.": "The note can be up to 600 characters.",
  "Las notas no pueden superar 500 caracteres.": "Notes can't exceed 500 characters.",
  "Registra el peso real; solo un precio acordado permite marcar peso no registrado.": "Record the actual weight; only an agreed price allows marking the weight as not recorded.",
  "Selecciona la fecha de salida.": "Select the departure date.",
  "Selecciona un chofer.": "Select a driver.",
  "Selecciona un cliente.": "Select a customer.",
  "Usa un formato como FLA-2604.": "Use a format like FLA-2604.",
  "Escribe el {label}.": "Enter the {label}.",
  "largo": "length",
  "ancho": "width",
  "alto": "height",
  // bill-of-lading.ts
  "El número es demasiado grande.": "The number is too large.",
  "Escribe un número válido.": "Enter a valid number.",
  "Máximo 20 filas de pedidos.": "Up to 20 order rows.",
  "Máximo 60 filas de carga.": "Up to 60 cargo rows.",
  "No uses números negativos.": "Don't use negative numbers.",
  "Usa una fecha válida.": "Use a valid date.",
  "Máximo {max} caracteres.": "Up to {max} characters.",
  // customer.ts
  "Escribe al menos 5 caracteres.": "Enter at least 5 characters.",
  "Escribe el apellido paterno.": "Enter the last name.",
  "Escribe el nombre completo.": "Enter the full name.",
  "Escribe el nombre.": "Enter the first name.",
  "Escribe un nombre o referencia para identificar la entrega.": "Enter a name or reference to identify the delivery.",
  "Escribe un nombre para identificar la dirección.": "Enter a name to identify the address.",
  "La nota no puede exceder 500 caracteres.": "The note can't exceed 500 characters.",
  "Selecciona una dirección.": "Select an address.",
  "Usa el formato AL-MX-0000.": "Use the format AL-MX-0000.",
  // invoice-correction.ts
  "Indica una fecha válida.": "Enter a valid date.",
  // logistics.ts
  "Cuéntanos el detalle en al menos 10 caracteres.": "Tell us the details in at least 10 characters.",
  "Describe el asunto en al menos 5 caracteres.": "Describe the subject in at least 5 characters.",
  "Describe el contenido.": "Describe the contents.",
  "Elige una categoría.": "Choose a category.",
  "Escribe el tracking.": "Enter the tracking number.",
  "Escribe la tienda.": "Enter the store.",
  "Escribe un valor mayor a cero.": "Enter a value greater than zero.",
  "Selecciona al menos una caja.": "Select at least one box.",
  "Selecciona un destinatario.": "Select a recipient.",
  // reception-payment.ts
  "Agrega al menos dos pagos.": "Add at least two payments.",
  "Indica un monto positivo con hasta dos decimales.": "Enter a positive amount with up to two decimals.",
  "Usa como máximo 160 caracteres.": "Use at most 160 characters.",
  // category-schema.ts
  "Este identificador está reservado para carga personalizada.": "This identifier is reserved for custom cargo.",
} as const;
