# Decisiones y supuestos para la reunión

## Decisiones de diseño

1. El naranja A&L se reserva para la acción principal y estados de atención; el azul marino sostiene navegación y confianza.
2. Sora e Inter se autoalojan con `next/font/local` para evitar dependencias externas, conservar privacidad y hacer builds reproducibles.
3. Las ilustraciones son SVG originales de cajas, camión y rutas; no se usan fotografías ni recursos de terceros.
4. El cliente móvil recibe navegación compacta; escritorio conserva sidebar persistente. Las tablas densas permiten desplazamiento horizontal.
5. El peso solo aparece como límite de seguridad y dato de inspección. Todo importe principal proviene de la categoría de caja.
6. Las fechas se muestran con zona UTC para no desplazar fechas operativas al cambiar la zona horaria del navegador.
7. Las mutaciones del demo viven en memoria. Recargar el servidor restaura fixtures, una propiedad intencional para repetir reuniones.
8. Resend se ejecuta solo en servidor. Direcciones `.test` producen un resultado simulado para que las demos no envíen correo accidentalmente.

## Supuestos pendientes de confirmar

1. La dirección física de la bodega de Miami no fue proporcionada; la UI muestra “por confirmar”.
2. Teléfono, correo de soporte, redes sociales, aviso de privacidad, términos y dominio de producción no fueron proporcionados.
3. La cobertura, zonas de entrega, sucursales y tiempos de tránsito definitivos siguen pendientes. La lista actual es ilustrativa y está etiquetada.
4. Las tarifas de entrega a domicilio, seguro, recargos y tipo de cambio deben confirmarse. Los importes auxiliares de facturas son fixtures demo.
5. El default del demo usa casillero, empaque por cliente, facturación al despachar, ascenso de categoría y ambas modalidades de entrega.
6. Se permite rotar una caja al evaluar dimensiones: se comparan los tres lados ordenados contra los tres límites ordenados.
7. La cuenta nueva recibe el siguiente casillero después de los tres clientes fixture: `AL-MX-0004`.
8. RFC es opcional; la emisión fiscal real, datos fiscales del emisor y reglas de CFDI no forman parte del demo.
9. Los PDFs son documentos demostrativos, no comprobantes fiscales ni manifiestos aduanales oficiales.
10. El remitente Resend usa el dominio de prueba hasta configurar y verificar el dominio definitivo.

## Sustitución por producción

- Reemplazar el interior de `src/lib/services` por repositorios MySQL/API sin cambiar componentes.
- Persistir usuarios con contraseñas hasheadas, sesiones revocables, cajas, eventos, facturas, tickets y configuración.
- Añadir almacenamiento privado para fotos y comprobantes, antivirus, límites de archivo y URLs firmadas.
- Implementar colas y webhooks de Resend, reintentos, preferencias de notificación y registro de entregabilidad.
- Definir autorización por recurso además del filtro optimista de `proxy.ts`, auditoría, rate limiting y observabilidad.
- Sustituir el catálogo postal de muestra por una fuente oficial completa y versionada.
