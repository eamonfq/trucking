# Bill of Lading operativo

Disponible en Admin > Camiones > detalle > Bill of Lading PDF. Reutiliza la ruta protegida `/api/camiones/[id]/manifiesto`; solo administradores.

El PDF se genera al descargarlo con la carga y ubicaciones actuales de la base de datos. Incluye origen, paradas y fechas estimadas, transportista, unidad, chofer, piezas, peso real, volumen exterior sumado, destinatarios, medidas por pieza y espacios de firmas. El peso dimensional de facturación no representa el peso físico del camión.

El código del viaje identifica el documento. Los viajes planificados/en carga llevan BORRADOR. No es un archivo histórico inmutable: conservar la copia descargada si se requiere constancia de una salida concreta.

SCAC, NMFC/clase, COD, condiciones del flete y firmas requieren confirmación manual. No se copian certificaciones ni firmas del PDF de referencia. El formato necesita validación del transportista antes de utilizarse como documento contractual.

No requiere migración de MySQL. La descarga utiliza el logo `public/brand/logoayl.png`.

QA sin base de datos ni correos: `node scripts/preview-bill-of-lading.mjs`. Genera una muestra ficticia de 24 piezas, 756 lb y 50 ft³ en `output/pdf/bill-of-lading-muestra.pdf`. Se verificaron las tres páginas, códigos y totales.
