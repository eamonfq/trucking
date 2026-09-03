# Auditoría funcional y visual

Fecha: 2 de septiembre de 2026. Recorrido efectuado sobre `next start` con las cuentas `admin@demo.test` y `mariana@demo.test`. Se navegaron todas las rutas existentes con el navegador automatizado y se contrastó cada acción con los servicios y stores mock.

## Hallazgos transversales

| Elemento | Qué hace hoy | Qué debería hacer | Severidad |
|---|---|---|---|
| Persistencia | Administración muta algunos arreglos en memoria; varias acciones del cliente solo cambian estado React o envían correo. | Todas las acciones deben mutar el mismo store mock para conservar paridad admin/cliente durante la sesión. | Bloqueante |
| Identidad del cliente | Varias páginas y acciones usan `usr-001` y `mariana@demo.test` directamente. | Resolver siempre usuario y correo desde la sesión. | Bloqueante |
| Máquina de estados | Existe una secuencia local únicamente para camiones; no valida precondiciones y el cierre marca cajas entregadas automáticamente. | Transiciones tipadas para caja, envío, camión y factura, con historial, precondiciones y cascadas explícitas. | Bloqueante |
| Historial | `TimelineEvent` guarda `status`, ubicación y descripción; no conserva estado anterior ni actor. | Guardar `{ from, to, actor, at, note }` y mostrar el mismo historial en admin y cliente. | Bloqueante |
| Estados visuales | Etiquetas y estilos están divididos entre `config/statuses.ts` y `components/ui/badge.tsx`. | Un solo mapa de estado con etiqueta, color y semántica, consumido por todos los badges. | Incompleto |
| Feedback | Existe un `ToastProvider`, pero no está montado ni se usa; predomina texto local después de guardar. | Toast accesible para éxito y error, junto con confirmaciones para acciones sensibles. | Incompleto |
| Vacío/carga/error | Hay límites globales y componentes reutilizables, pero las listas y detalles no presentan estados propios. | Skeleton, vacío con acción y error contextual en cada módulo. | Incompleto |
| Textos de negocio | Se muestran “por confirmar”, “demo”, códigos DEMO y datos genéricos en pantallas operativas. | Microcopy realista; pendientes documentados solo en `docs/DECISIONS.md`. | Incompleto |

## Panel operativo

| Ruta / elemento | Qué hace hoy | Qué debería hacer | Severidad |
|---|---|---|---|
| `/admin` · métricas | Muestra totales y tres camiones recientes sin enlaces de profundización. | Métricas derivadas del store, actividad reciente y accesos a excepciones operativas. | Incompleto |
| `/admin/recepcion` · sugerencia | Calcula categoría y precio en vivo correctamente. | Mantener cálculo y explicar si la categoría subió por medida o peso. | Cosmético |
| `/admin/recepcion` · registrar | Devuelve un código, pero no crea la caja, ignora foto/sobrescritura y no notifica al cliente. | Persistir caja, validar sobrescritura, bloquear excedentes, permitir rechazo con motivo y disparar notificación/email. | Bloqueante |
| `/admin/bodega` · inventario | Selecciona cualquier caja visible y la carga en un camión; no valida capacidad ni elegibilidad completa. | Filtros, selección múltiple segura, capacidad por categoría y asignación con error legible. | Bloqueante |
| `/admin/bodega` · detalle | No existen enlaces ni ruta de detalle. | Crear `/admin/cajas/[id]` con fotos, factura e historial. | Bloqueante |
| `/admin/camiones` · alta | Crea un camión en memoria con cuatro campos libres y validación mínima. | Placa validada, chofer seleccionable/alta rápida, fecha futura, destino controlado, capacidad y notas. | Bloqueante |
| `/admin/camiones` · lista | No tiene búsqueda, filtros u ordenamiento. | Filtrar por estado/ruta, buscar código/placa y ordenar por salida. | Incompleto |
| `/admin/camiones` · “Avanzar estado” | Avanza sin confirmación ni precondiciones; cierra y entrega cajas/envíos automáticamente. | Acción siguiente con nombre específico, diálogo de cascada, toast e historial. | Bloqueante |
| `/admin/camiones/[id]` | Ruta inexistente. | Detalle editable en planificado, cajas, capacidad, timeline y manifiesto enriquecido. | Bloqueante |
| `/admin/facturas` · pagos | Aprueba directamente los reportes; no permite rechazo, nota ni detalle. | Detalle, comprobante, aprobar/rechazar con nota y transición válida. | Bloqueante |
| `/admin/facturas` · generación | Solo presenta fixtures; `billingMoment` se muestra pero no genera documentos. | Crear factura al recibir o despachar según configuración y agrupar líneas por categoría. | Bloqueante |
| `/admin/clientes` · lista | Tarjetas estáticas con conteos; todos aparecen activos. | Búsqueda, filtros, columnas solicitadas, saldo y último movimiento. | Incompleto |
| `/admin/clientes/[id]` | Ruta inexistente y no hay acciones de cuenta. | Detalle con pestañas, edición, CRUD relacionado, actividad, notas y acciones administrativas. | Bloqueante |
| `/admin/configuracion` | Edita flags y tarifas en memoria con efecto inmediato; no valida límites ni muestra errores. | Conservar efecto inmediato, añadir esquema, validación y toast de resultado. | Incompleto |
| Navegación móvil admin | El menú responsive abre y enlaza correctamente. | Mantener comportamiento y marcar ruta activa. | Cosmético |

## Panel del cliente

| Ruta / elemento | Qué hace hoy | Qué debería hacer | Severidad |
|---|---|---|---|
| `/cliente` · resumen | Datos correctos para Mariana, pero el botón “Copiar datos” no tiene acción y muestra dirección pendiente. | Copiar con feedback y mostrar instrucciones operativas reales desde configuración. | Incompleto |
| `/cliente/cajas` · filtros | Los botones son visuales y no filtran. | Filtrar por grupos de estado, mostrar conteo y vacío contextual. | Incompleto |
| `/cliente/cajas/[codigo]` | Muestra categoría, dos placeholders de foto y timeline básico; no valida propiedad de la caja. | Fotos reales mock, historial de transiciones compartido y autorización por recurso. | Bloqueante |
| `/cliente/envios` | Lista y enlaza a detalle; carece de filtros y estado vacío. | Conservar navegación, añadir filtros, resumen y vacío con acción. | Incompleto |
| `/cliente/envios/[codigo]` | Muestra cajas, destino y timeline básico; no valida propiedad. | Reflejar cascadas del camión y entrega individual con historial compartido. | Bloqueante |
| `/cliente/envios/nuevo` | Valida formulario y bloquea una caja excedida seleccionada, pero solo envía correo; no crea envío ni cambia cajas. | Persistir envío, confirmar cajas elegibles, vincular destinatario y reflejarlo en admin. | Bloqueante |
| `/cliente/pre-alertas` | Valida y muestra éxito, pero no crea caja pre-alertada. | Persistir pre-alerta/caja y hacerla visible en cliente y recepción. | Bloqueante |
| `/cliente/cotizador` | Sugiere categoría y precio en vivo. | Mantener cálculo, agregar contexto de política vigente y estados vacío/error. | Cosmético |
| `/cliente/direcciones` | CRUD solo en estado local; eliminar no confirma y CP no autocompleta. | Persistir en store, confirmar eliminación y completar municipio/estado por CP. | Bloqueante |
| `/cliente/destinatarios` | CRUD solo local y asigna siempre `usr-001`; eliminar no confirma. | Persistir con usuario de sesión y confirmación. | Bloqueante |
| `/cliente/facturas` | Lista estados y totales correctamente, sin vacío ni filtros. | Reflejar generación operativa y ofrecer vacío/filtrado. | Incompleto |
| `/cliente/facturas/[id]` | PDF funciona; reportar pago solo envía correo y no cambia la factura ni conserva comprobante. | Persistir reporte, comprobante mock e historial; validar propiedad en página y PDF. | Bloqueante |
| `/cliente/estado-cuenta` | Solo deriva cargos de facturas y usa usuario fijo. | Mostrar cargos, pagos, saldo y movimientos del usuario de sesión. | Bloqueante |
| `/cliente/notificaciones` | Marcar como leída solo vive en React. | Persistir lectura y recibir eventos creados por operaciones. | Incompleto |
| `/cliente/soporte` | Hilo local con ticket y correo hardcodeados. | Persistir ticket, asunto, mensajes y usuario de sesión con microcopy real. | Incompleto |
| `/cliente/ayuda` | Explica empaque en términos de demo. | Convertir a guía operativa concreta y enlazar acciones relevantes. | Cosmético |
| `/cliente/cuenta` | Consulta al primer usuario del arreglo; no permite editar. | Resolver sesión y editar los datos autorizados. | Bloqueante |
| `/cliente/cuenta/seguridad` | Valida forma, pero no comprueba contraseña actual ni la persiste. | Validar credencial, actualizar store mock y notificar. | Bloqueante |

## Consistencia observada

- Los badges representan los estados existentes, pero algunas listas imprimen identificadores técnicos de categoría (`small`, `x-large`) en lugar de nombres.
- El admin puede mutar camiones/cajas en el proceso del servidor, pero el cliente crea envíos, pre-alertas, pagos y CRUD únicamente en el navegador; por eso no hay paridad real.
- Una caja `excede-categoria` puede cargarse desde Bodega, contradiciendo el bloqueo que sí muestra Crear envío.
- Cerrar un camión convierte todas sus cajas en entregadas sin registro de entrega individual.
- Las páginas de detalle de caja, envío y factura deben validar que el recurso pertenece al usuario autenticado.

## Lista priorizada

1. Implementar store compartido, identidad por sesión, máquina de estados e historial tipado.
2. Completar camiones, capacidades, recepción y bodega con precondiciones y cascadas.
3. Construir detalle y gestión integral de clientes.
4. Persistir facturación, pagos, pre-alertas, envíos, CRUD y notificaciones con paridad.
5. Cerrar microcopy, vacíos, skeletons, errores y revisión responsive.

## Línea base visual

Medición previa con Lighthouse 13.4.0 sobre la compilación de producción:

| Vista | Rendimiento | Accesibilidad | Buenas prácticas | SEO |
|---|---:|---:|---:|---:|
| Landing `/` | 100 | 100 | 100 | 100 |
| Login `/login` | 100 | 100 | 100 | 100 |
| Panel `/cliente` | 100 | 100 | 100 | 100 |
