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
9. Toda mutación del cliente vive en acciones de servidor (`src/lib/auth/client-actions.ts`) y resuelve la identidad desde la cookie de sesión. El componente nunca envía el `userId`, de modo que el navegador no puede actuar en nombre de otra cuenta.
10. Las páginas del cliente usan `requireClientUser()`: si la sesión caduca o la cuenta se desactiva, redirigen a login en vez de mostrar datos de otro usuario. Las cuentas inactivas tampoco pueden iniciar sesión.
11. `requireClientUser()` devuelve el usuario sin `internalNotes`. Las notas internas son contenido operativo y no deben viajar al navegador del cliente.
12. Un envío nace en `pendiente` y pasa a `confirmado` a través de la máquina de estados, no por asignación directa, para que el historial conserve los dos eventos.
13. Una dirección no se puede eliminar si un destinatario la usa, y un destinatario no se puede eliminar si tiene envíos sin entregar. Se prefiere bloquear con explicación antes que dejar referencias rotas.
14. Cada acción de operaciones que afecta al cliente (recepción, factura emitida, avance de camión, pago aprobado o rechazado) escribe además en el centro de notificaciones. El correo es un canal adicional, no el registro.
15. El ticket de soporte es una entidad con hilo (`src/lib/data/support.ts`) y estados `abierto`, `en-revisión` y `cerrado`, integrados al mismo mapa de estados que el resto del dominio.
16. Los detalles de caja, envío y factura llaman a `notFound()` cuando el recurso no existe o no pertenece a la sesión. Como el panel usa `loading.tsx`, la respuesta va en streaming y Next 16 la entrega con estado HTTP 200 más `<meta name="robots" content="noindex">`, según su documentación. No se filtra ningún dato del recurso ajeno; para obtener un 404 real habría que mover la comprobación a `proxy.ts`, lo que duplicaría la autorización y se evaluó innecesario en el demo. Las rutas PDF sí responden 403 porque no hacen streaming.

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
11. La respuesta de Operaciones a un ticket de soporte no está automatizada: el demo persiste el hilo del cliente y muestra las respuestas de los fixtures. Falta definir quién atiende y con qué SLA.
12. El código postal completa municipio y estado solo para los cerca de 30 CP del catálogo de muestra. Fuera de esa lista el usuario los escribe a mano.

## Sustitución por producción

- Reemplazar el interior de `src/lib/services` por repositorios MySQL/API sin cambiar componentes.
- Persistir usuarios con contraseñas hasheadas, sesiones revocables, cajas, eventos, facturas, tickets y configuración.
- Añadir almacenamiento privado para fotos y comprobantes, antivirus, límites de archivo y URLs firmadas.
- Implementar colas y webhooks de Resend, reintentos, preferencias de notificación y registro de entregabilidad.
- El demo ya valida propiedad por recurso en páginas y rutas PDF del cliente; en producción esa comprobación debe vivir en la capa de datos, junto con auditoría, rate limiting y observabilidad.
- Sustituir el catálogo postal de muestra por una fuente oficial completa y versionada.
