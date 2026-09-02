# PROMPT MAESTRO — Demo A&L Trucking Logistics (Next.js 16 + TypeScript + Tailwind CSS 4)

## 0. Rol y objetivo

Actuás como arquitecto y desarrollador frontend senior. Vas a construir un **demo independiente y navegable** para A&L Trucking Logistics: empresa de carga terrestre en camión USA → México que cobra **precio fijo por categoría de caja**, no por libra ni por volumen.

El demo NO es producto final. Es una herramienta para validar el flujo operativo con el cliente. Por eso:

- Toda la lógica de negocio vive en una capa de servicios con datos mock tipados, reemplazable por un backend real sin tocar la UI.
- Los puntos del flujo que aún no están confirmados con el cliente (ver sección 2) se modelan como configuración, no como código fijo.
- Calidad visual: ultra premium. Debe verse como un producto terminado, no como un prototipo.

Trabajás **una fase por vez**. Al terminar cada fase: `npm run build` sin errores ni warnings de tipos, `npm run lint` limpio, commit con mensaje `feat(fase-N): ...`, y un resumen de 5 líneas de lo hecho y lo que queda abierto. No arranques la fase siguiente sin confirmación.

## 1. Stack y convenciones (no negociables)

- Next.js 16 (App Router, Server Components por defecto, Client Components solo donde haya interacción), TypeScript en modo `strict`, Tailwind CSS 4 con tokens definidos en `@theme`.
- Sin UI kits pesados. Componentes propios en `src/components/ui`. Iconos: `lucide-react`.
- Formularios: `react-hook-form` + `zod`. Cada schema en `src/lib/schemas`.
- Estado de sesión: cookie HTTP-only firmada, simulada en `src/lib/auth` (usuarios mock). Rutas protegidas por `middleware.ts` (`/cliente/*`, `/admin/*`).
- Datos: `src/lib/data/*.ts` (fixtures tipados) + `src/lib/services/*.ts` (funciones async que simulan latencia 200-400 ms). La UI nunca importa fixtures directo, siempre servicios.
- Idioma de la UI: español de México (tú, no vos; "código postal", "colonia", "municipio"). Moneda: USD con formato `$80.00 USD`; mostrar referencia MXN opcional con tipo de cambio configurable.
- Estructura:
  ```
  src/app/(marketing)      landing, tracking, ayuda
  src/app/(auth)           login, registro, recuperar, restablecer
  src/app/(cliente)        panel del cliente
  src/app/(admin)          panel operativo mínimo
  src/components/{ui,marketing,cliente,admin}
  src/lib/{data,services,schemas,auth,config,utils}
  ```
- Accesibilidad: contraste AA, foco visible, labels reales, navegación por teclado.
- Responsive real: móvil primero; el panel del cliente se usará mucho desde teléfono.

## 2. Dominio: lo que sabemos y lo que no

### 2.1 Tarifario (confirmado, viene del banner del cliente)

| Categoría | Dimensiones (in) | Precio | Límite de peso (caja + contenido) |
|---|---|---|---|
| Small | 10 × 16 × 12 | $80 | 50 lb |
| Medium | 16 × 20 × 15 | $110 | 60 lb |
| Large | 16 × 26 × 15 | $180 | 80 lb |
| X Large | 20 × 24 × 20 | $230 | 110 lb |
| Cubo | 24 × 24 × 24 | $260 | 130 lb |

Reglas de empaque que el cliente comunica: caja firme, sellada, bien empacada; no cajas dañadas, rotas ni deformadas; la caja nunca debe perder su forma cuadrada.

Definí esto en `src/lib/config/box-categories.ts` como fuente única. Nada de precios hardcodeados en componentes.

### 2.2 Puntos NO confirmados (modelar como configuración en `src/lib/config/flow.ts`)

1. **Origen de la caja**: `casillero` (el cliente compra online y llega a bodega Miami, con pre-alerta) o `entrega-directa` (el cliente lleva la caja o A&L la recolecta). El demo debe soportar ambos con un flag `originMode`; la UI muestra u oculta Pre-Alertas según el flag.
2. **Quién empaca**: `cliente` o `agencia`. Si es agencia, existe un paso "empacado en caja X" en el flujo operativo.
3. **Momento de facturación**: `al-recibir` (factura por caja al ingresar a bodega) o `al-despachar` (factura por envío cuando sale el camión).
4. **Excedente de categoría** (caja que supera peso o dimensiones): `subir-categoria`, `recargo` o `rechazo`. Default del demo: sugerir categoría superior y pedir confirmación; nunca cobrar en silencio.
5. **Entrega en destino**: recogida en sucursal, entrega a domicilio con tarifa por zona, o ambas.

Cada flag tiene un default razonable y todos se cambian desde un panel `/admin/configuracion` para poder demostrar variantes en la reunión con el cliente.

### 2.3 Estados

- Caja (`Box`): `pre-alertada → recibida → categorizada → en-bodega → cargada-en-camion → en-transito → en-destino → entregada`. Excepciones: `excede-categoria`, `rechazada`.
- Envío (`Shipment`, agrupa cajas de un cliente hacia un destinatario): `pendiente → confirmado → en-transito → en-destino → entregado`.
- Camión (`Truck`, equivalente a la guía máster): `planificado → cargando → despachado → en-frontera → en-destino → cerrado`.
- Factura (`Invoice`): `borrador → emitida → pago-reportado → pagada → vencida`.

Cada factura tiene **N líneas**, una por categoría de caja: `2 × Small $80 = $160`, `1 × Large $180 = $180`. No existe unidad por libra ni por pie cúbico en ningún lado.

## 3. Sistema de diseño (Fase 0, antes de cualquier pantalla)

Derivado del banner del cliente. Documentalo en `docs/DESIGN.md` y en los tokens de Tailwind.

- **Paleta**: naranja A&L `#E8621C` (acción principal, acentos), azul marino `#1C2B4B` (texto principal, fondos oscuros, sidebar), crema `#F6F1E9` (fondos de marketing), blanco `#FFFFFF` (superficies), grises cálidos para bordes y texto secundario, verde y rojo solo para estados. Modo oscuro no requerido.
- **Tipografía**: display geométrica de peso alto para titulares (Bricolage Grotesque o Sora vía `next/font`), Inter para UI y cuerpo. Escala tipográfica definida, nada de tamaños arbitrarios.
- **Componentes base**: Button (primary/secondary/ghost/destructive, con loading), Input, Select, Textarea, Checkbox, Badge de estado (un color por estado, mapeado desde el enum), Card, Stat card, Timeline, Table con estado vacío, Dialog, Toast, Skeleton, EmptyState, PageHeader, Sidebar.
- **Motion**: transiciones sutiles (150-250 ms), entradas escalonadas en listas, sin animaciones decorativas. `prefers-reduced-motion` respetado.
- **Criterio "premium"**: espaciado generoso, jerarquía clara, una sola fuente de acento naranja por pantalla, ilustraciones de caja hechas en SVG propio (isométricas, línea limpia) en lugar de fotos de stock. Cero aspecto de plantilla.
- Sin emojis en ninguna parte de la UI.

## 4. Fases

### Fase 0 · Fundación
- Proyecto, tokens, fuentes, layout raíz, componentes base, capa de servicios y fixtures (usuarios, cajas, envíos, camiones, facturas, notificaciones, direcciones, destinatarios).
- `src/lib/config/box-categories.ts` y `src/lib/config/flow.ts`.
- Función `suggestCategory(dims, weightLb)` con tests (Vitest): devuelve la categoría más pequeña donde entren dimensiones y peso, o `null` si no entra en ninguna; expone si hubo que subir de categoría por peso o por medida.
- Página `/design` (solo dev) que muestre todos los componentes y estados.

### Fase 1 · Landing page (`/`)
Secciones, en este orden:
1. Header fijo con logo tipográfico "A&L Trucking Logistics", navegación (Tarifas, Cómo funciona, Rastrear, Ayuda), CTA "Iniciar sesión" y "Registrarme".
2. Hero: titular fuerte (mensaje del cliente: "Envía más, paga menos"), subtítulo con la propuesta (precio fijo por caja, sin sorpresas por peso), CTA doble, ilustración isométrica de camión y cajas.
3. Buscador de tracking inline (número de guía → redirige a `/rastrear/[codigo]`).
4. Tarifas: las cinco categorías como tarjetas con dimensiones, precio, límite de peso e ilustración proporcional de la caja. Fuente: `box-categories.ts`.
5. Cotizador rápido: el visitante ingresa medidas y peso, se sugiere categoría y precio en vivo (usa `suggestCategory`).
6. Cómo funciona: 4 pasos según `flow.originMode` (el texto cambia si es casillero o entrega directa).
7. Cómo enviar tu caja: forma correcta vs incorrecta, con los tres avisos del cliente.
8. Cobertura: Miami → México, con lista de estados de destino y tiempos estimados (mock).
9. FAQ (acordeón, 8 preguntas).
10. Footer con contacto, redes, legal.

SEO: metadata completa, OpenGraph, `sitemap.ts`, `robots.ts`. Lighthouse objetivo: 95+ en las cuatro métricas.

### Fase 2 · Autenticación (`/(auth)`)
- **Login**: correo o número de casillero + contraseña, "recordarme", enlace a recuperar. Errores claros sin revelar si el correo existe.
- **Registro adaptado a México** (dos pasos, con barra de progreso):
  - Paso 1, cuenta: nombre(s), apellido paterno, apellido materno, correo, teléfono (+52, 10 dígitos, validado), contraseña con medidor de fortaleza, confirmación, aceptación de términos.
  - Paso 2, dirección de entrega en México: calle, número exterior, número interior (opcional), colonia, código postal (5 dígitos; al escribirlo, autocompletar estado y municipio desde un catálogo mock de ~30 CP de muestra), municipio/alcaldía, estado (select con los 32 estados), referencias. Opcional: RFC (validar formato) para clientes que facturan.
  - Al terminar: se asigna casillero `AL-MX-0001` (correlativo) y se muestra pantalla de bienvenida con la dirección de bodega en Miami para usar en compras (si `originMode = casillero`) o las instrucciones de entrega/recolección (si `entrega-directa`).
- **Recuperar contraseña**: correo → mensaje neutro → pantalla mock de "correo enviado" con enlace de demo al restablecimiento.
- **Restablecer / cambiar contraseña**: desde enlace con token mock y desde el panel (`/cliente/cuenta/seguridad`), con contraseña actual, nueva y confirmación.
- Todo con schemas zod compartidos entre cliente y server actions.

### Fase 3 · Tracking público (`/rastrear`, `/rastrear/[codigo]`)
- Acepta código de caja, de envío o de camión; detecta el tipo por prefijo (`BX-`, `SH-`, `TR-`).
- Timeline vertical con estados, fecha, ubicación y descripción; el estado actual destacado. Mapa esquemático Miami → frontera → destino como SVG con progreso.
- Para envíos: lista de cajas con categoría y estado individual.
- Sin exponer datos personales: solo ciudad de destino y primer nombre del destinatario.
- Estado "no encontrado" cuidado, con CTA a soporte.

### Fase 4 · Panel del cliente (`/cliente`)
Sidebar con la misma estructura del panel de referencia, adaptada:

- **Inicio**: tarjeta de casillero (nombre + `AL-MX-0001`, dirección de bodega en Miami con botón copiar, aviso "Siempre coloca A&L junto a tu nombre en cada compra" si `originMode = casillero`), cuatro contadores (En bodega · En camino · En México · Entregadas), saldo pendiente con botón a facturas, últimas notificaciones, atajo "Cotizar una caja".
- **Mis Cajas** (equivale a "Mis Paquetes"): tabla/lista por pestañas de estado; cada caja muestra código, categoría con badge, dimensiones y peso registrados, precio, tracking de origen si aplica. Detalle con fotos mock de recepción.
- **Mis Envíos**: envíos con cajas agrupadas, destinatario, camión asignado, estado; detalle con timeline.
- **Crear envío** (equivale a "Despachar"): elegir cajas en bodega → elegir destinatario o dirección → resumen con desglose por categoría y total → confirmar. Si alguna caja está en `excede-categoria`, bloquear y explicar según `flow.excessPolicy`.
- **Pre-Alertas**: solo visible si `originMode = casillero`. Formulario: tienda, tracking, descripción, valor declarado, categoría estimada.
- **Cotizador**: medidas y peso → categoría sugerida, o aviso de que no entra en ninguna.
- **Direcciones** (en México) y **Destinatarios**: CRUD completo con validación mexicana (CP, estado, municipio).
- **Mis Facturas**: lista con estado; detalle con líneas por categoría (`cantidad × precio`), subtotal, seguro opcional, entrega a domicilio si aplica, total; botón "Descargar PDF" (generar con `@react-pdf/renderer`) y "Reportar pago" (monto, método, referencia, comprobante como archivo mock).
- **Estado de cuenta**: movimientos y saldo.
- **Notificaciones**: centro con leído/no leído.
- **Soporte**: tickets con hilo de mensajes.
- **Ayuda**: guía paso a paso con las reglas de empaque, y FAQ.
- **Cuenta**: datos personales, seguridad (cambio de contraseña).

Datos mock: al menos 3 clientes, 25 cajas repartidas en todos los estados, 8 envíos, 3 camiones, 10 facturas, para que cada pantalla tenga contenido real y estados vacíos.

### Fase 5 · Panel operativo mínimo (`/admin`)
Solo lo necesario para demostrar el ciclo completo en la reunión:
- **Recepción**: ingresar caja por casillero o cliente, medir (dims + peso), categoría sugerida con posibilidad de sobrescribir y motivo; manejo de excedente según política; foto mock.
- **Bodega**: cajas por estado, filtros, acción masiva "cargar en camión".
- **Camiones**: crear camión (placa, chofer, fecha de salida, ruta), asignar cajas, ver capacidad por número de cajas por categoría, despachar, avanzar estado (cascadea a cajas y envíos), manifiesto imprimible (PDF) con conteo por categoría y total.
- **Facturas**: generar al momento definido por `flow.billingMoment`, aprobar pagos reportados.
- **Clientes**: lista y detalle.
- **Configuración**: los cinco flags de `flow.ts` editables en vivo, y edición del tarifario.

### Fase 6 · Pulido y entrega
- Revisión de responsive en 360, 768, 1280 y 1536 px.
- Estados de carga (skeletons), vacíos y de error en todas las pantallas.
- Página 404 y 500 con la identidad.
- `README.md`: cómo correr, usuarios demo, cómo cambiar los flags de flujo, qué es mock y qué haría falta para producción.
- `docs/DECISIONS.md`: cada decisión de diseño tomada y cada supuesto pendiente de confirmar con el cliente, listado para llevar a la reunión.
- Lighthouse final en landing, login y panel.

## 5. Reglas de ejecución

1. Nunca inventes datos del cliente que no estén en este prompt (precios, direcciones, teléfonos). Lo que falte, usá placeholders evidentes y anotalo en `docs/DECISIONS.md`.
2. Ningún precio, dimensión ni estado hardcodeado en componentes: todo desde `config` y `data`.
3. Si un requisito depende de un flag de flujo no confirmado, implementá ambas variantes y dejá el flag.
4. No agregues dependencias sin justificarlo en el resumen de la fase.
5. Si algo del prompt es contradictorio o ambiguo, pará y preguntá antes de codear.

Empezá por la Fase 0. Antes de escribir código, presentá en 15 líneas el plan de esa fase y las decisiones de diseño que vas a tomar.
