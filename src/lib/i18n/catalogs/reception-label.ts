/**
 * Etiqueta térmica del paquete (`package-label.tsx`, página `/etiquetas/[id]`). Lo impreso va en los
 * dos idiomas (`bilingual`), porque la etiqueta cruza la frontera; los controles de pantalla, en el
 * idioma de quien la imprime. Clave: español; valor: inglés.
 */
export const receptionLabel = {
  "Dirección / referencia no registrada": "Address / reference not recorded",
  "Imprimir etiqueta": "Print label",
  "Papel 100 × 150 mm · Escala 100 % · Sin encabezados ni pies del navegador.": "Paper 100 × 150 mm · Scale 100% · No browser headers or footers.",
  "RECEPCIÓN DE PAQUETE · {position}": "PACKAGE RECEIPT · {position}",
  "RECEPCIÓN DE PAQUETE": "PACKAGE RECEIPT",
  "Código de pieza:": "Piece code:",
  "Contenido:": "Contents:",
  "Código de pieza: {code}": "Piece code: {code}",
  "Código de barras {code}": "Barcode {code}",
  "Envía:": "Sender:",
  "No registrado": "Not recorded",
  "Casillero": "Locker",
  "Peso conjunto del concepto": "Line item combined weight",
  "Peso": "Weight",
  "{total} lb / {pieces} piezas": "{total} lb / {pieces} pieces",
  "Sin pesaje individual de esta pieza": "This piece wasn't weighed individually",
  "Medidas · largo × ancho × alto": "Measurements · length × width × height",
  "No registradas": "Not recorded",
  "Contenido: {description}": "Contents: {description}",
  "Recibe:": "Recipient:",
  "Dirección / referencia": "Address / reference",
  "Conservar esta etiqueta durante todo el recorrido.": "Keep this label on for the entire trip.",
} as const;
