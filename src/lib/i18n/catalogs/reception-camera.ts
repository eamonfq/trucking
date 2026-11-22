/** Lector de códigos con la cámara (`camera-barcode-reader.tsx`, dentro del escáner de camión). Clave: español; valor: inglés. */
export const receptionCamera = {
  "La cámara no está disponible. Usa HTTPS y permite el acceso, o utiliza el lector USB/Bluetooth.": "The camera isn't available. Use HTTPS and allow access, or use the USB/Bluetooth scanner.",
  "Permiso de cámara denegado. Habilítalo en el navegador o utiliza el lector USB/Bluetooth.": "Camera permission denied. Enable it in the browser or use the USB/Bluetooth scanner.",
  "No se encontró una cámara. Conecta una o utiliza el lector USB/Bluetooth.": "No camera found. Connect one or use the USB/Bluetooth scanner.",
  "No se pudo iniciar la cámara. Comprueba que otra aplicación no la esté utilizando.": "The camera couldn't start. Make sure no other app is using it.",
  "Vista de cámara para escanear etiquetas": "Camera view for scanning labels",
  "Centra el código de barras de la etiqueta. Al leerlo se registrará y se apagará la cámara.": "Center the label's barcode. Once it's read, it will be recorded and the camera will turn off.",
} as const;
