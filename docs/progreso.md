# Progreso

_Última actualización: 2026-11-20_

## Dónde quedó el trabajo

- **Producción vaciada de operaciones el 2026-11-20**, a pedido del dueño. Se conservaron clientes, destinatarios, direcciones, personal y configuración, y los folios continúan (detalle en docs/decisiones.md). Verificado después: no queda nada operativo, el sitio responde, un folio borrado muestra «No encontramos ese folio» y no hay errores nuevos en PM2. Si hubiera que deshacerlo: restaurar `~/Respaldos/ayl-produccion/ayl_real-20261120T213939Z.sql.gz`.
- **Todo el sistema en español e inglés: fases 1 a 4 hechas en local (2026-11-20), sin commit ni despliegue.**
  - Incluye:
    - el sitio público y el acceso;
    - el panel del cliente, el admin y el almacén, cada uno con su selector ES | EN;
    - los mensajes del servidor, que se traducen en `runMutation`;
    - los correos, push y avisos en el idioma del destinatario;
    - la factura y el recibo en el idioma del cliente;
    - la etiqueta y el manifiesto bilingües, y el BOL en inglés.
  - El admin elige el idioma del cliente en su ficha y en el alta en mostrador.
  - Unos 4.000 textos. Reglas, glosario, fases y preguntas abiertas en docs/idiomas.md; decisión en docs/decisiones.md.
  - **Corrige además un error de producción:** el panel del cliente daba error 500 a cualquier cliente que entrara. `src/app/(cliente)/layout.tsx` pedía la lista completa de usuarios, que solo pueden leer los admins. El error existía desde el 2026-09-25 (commit `cd21d5d`). Ahora el layout carga solo al usuario de la sesión.
  - Verificado con Node 22:
    - 395 tests unitarios y 89 de integración, lint, `tsc` y build en verde;
    - recorrido en el navegador con la copia local: 17 pantallas del cliente y 22 del admin en inglés, sin errores de consola, sin texto de interfaz en español y sin desborde en móvil (390 px);
    - el modo español sigue igual.
  - En la copia local quedaron, solo por la prueba, la cuenta AL-MX-0019 verificada y la preferencia `en` en ella y en `admin-1`.
  - **Siguiente paso:** commit y despliegue (respaldo y después `./deploy.sh`); que el dueño revise el inglés en el uso diario y responda las preguntas 4–7 de idiomas.md.
- **Bill of lading editable: desplegado en producción el 2026-11-20** (commit `4959f02`). Lo pidió el cliente: crear el BOL, mostrar cantidades en vez del detalle de cada caja y llenar las instrucciones especiales.
  - Va en Admin › Camiones › Bill of Lading, con el formato VICS de su muestra (`~/Downloads/bill of landing2.pdf`). Se crea desde un camión o con «Nuevo en blanco».
  - El PDF por pieza del camión se conserva como «Manifiesto PDF».
  - Antes del despliegue, con Node 22 (el de producción): 276 tests unitarios, 86 de integración, lint, `tsc` y build en verde. En la copia local también se recorrió en el navegador: crear desde TR-260101, editar, guardar, PDF, móvil y eliminar.
  - Después del despliegue: `/admin/camiones/bill-of-lading` redirige al login y `/api/bill-of-lading/[id]` responde 401 sin sesión. No hay errores nuevos en PM2. No se crearon BOL de prueba en producción.
  - Con las 228 piezas reales en bodega, el prellenado da 16 filas (200 cajas en una, más 15 de vehículos) en lugar de 228.
  - Detalle en docs/BILL-OF-LADING.md.
  - **Siguiente paso:** que el cliente lo use y confirme los puntos de «Pendiente › Código».
- **Producción** (`cargo-deploy:/var/www/trucking`) está en el commit `4db2ce6` (segundo despliegue del 2026-11-20: numeración de camiones con secuencia protegida). `origin/master` puede ir por delante solo con cambios de `docs/`.
- **Ruido conocido en el log de errores de PM2:** «The Server Reference ID did not match the expected format» (unas 3.900 líneas antes del despliegue). Son peticiones con una cabecera `Next-Action` falsa, de bots; no son fallos de la aplicación.
- **Regla desde el 2026-11-07:** en cargo no se cambia nada a mano. Solo cambia mediante `./deploy.sh`, con código probado en local y `scripts/respaldo-produccion.sh` justo antes (docs/decisiones.md).
- **Entorno local integrado** (2026-11-06):
  - `ayl_real` está en la MySQL 8.0 local (3306) como copia saneada de producción, y `.env.local` apunta ahí.
  - Accesos locales en `.local/acceso-local.txt`.
  - Verificado: 267 tests unitarios, 85 de integración, lint, `tsc` y build en verde; `/login`, el rastreo público y seis páginas de `/admin` responden 200 con los datos reales.
- **Primer respaldo de producción** (2026-11-07) en `~/Respaldos/ayl-produccion/`, comprobado restaurándolo en una base temporal.

## Pendiente

### Producción (no se toca el servidor salvo en despliegues planificados)
- [ ] **Decisión del dueño: permisos de `.env` y `.env.production` en `/var/www/trucking`, hoy 644.** El directorio se puede recorrer, así que otros usuarios del servidor (`guillen`, `caribe-deploy`, `postgres`) pueden leer `AUTH_SECRET`, la clave de Resend y la clave privada de Clover de producción. `chmod 600` no cambia el funcionamiento: PM2 corre como `deployer`, el dueño. Valorar además rotar esas claves. `.env.local` ya está en 600.
- [ ] **Respaldos solo manuales y solo en la Mac.** Valorar programarlos en la Mac (launchd) y una segunda copia fuera de la Mac. Sigue sin haber respaldos en el servidor.
- [ ] **El sitio no es indexable:** `SEO_INDEXABLE=false` hace que `robots.txt` responda `Disallow: /` y que las páginas lleven `noindex, nofollow`. Confirmar si es intencional; cambiarlo requiere tocar el `.env` y desplegar.
- [ ] **`.env.local` del servidor con claves repetidas** (`EMAIL_DELIVERY` preview→resend, `TRUST_PROXY` false→true; gana la última). Además, `PORT=3060` no se usa y `.env.production` tiene otro `NEXT_PUBLIC_SITE_URL` (`truckingayl.vecility.com`), aunque lo anula `.env.local`. Funciona así; ordenarlo solo en un despliegue planificado.
- [ ] **Node:** producción usa 22.23.4 y local, 24; el README dice Node 24. Decidir: o un `.nvmrc` con 22, o subir el servidor a 24 en un despliegue planificado.

### Código
- [ ] **Dependencias vulnerables** (`npm audit`: 1 crítica, 3 altas). Se corrigen con `npm update` dentro de los rangos actuales: next 16.4.5, sharp 0.35.5, zod 4.6.7. El riesgo real es bajo: no se usa `next/og` y `sharp` solo recibe PNG o JPEG validados.
- [ ] **Bill of lading, por confirmar con el cliente:**
  - que el PDF le sirva tal cual (textos VICS, sin logo, firmas con el nombre escrito);
  - la descripción por defecto de la fila de cajas («Household goods and personal effects»);
  - si quiere el tipo de vehículo (ATV, Motorcycle) en vez de `VEHICLE`.
  - Pendientes menores: en un BOL de varias páginas, la primera fila de la página siguiente no lleva línea superior; y la heurística del VIN puede agrupar piezas que no son vehículos (todo es editable).
- [ ] **Recepción: el botón «Guardar recepción» se apaga sin decir por qué** (consulta del cliente, 2026-11-13). El destinatario en México es obligatorio para guardar (`reception-form.tsx:208`), pero el alta rápida del cliente lo marca «(opcional)» (`customer-quick-create.tsx:74`) y el único aviso es un texto gris en el paso 01. Propuesta: mostrar junto al botón lo que falta, con enlace, y quitar el «(opcional)».
- [ ] **Rastreo público** (`/rastrear/[codigo]`), visto en la misma consulta:
  - ~~con una caja sin envío, el título decía «En bodega en bodega Miami.»~~ Corregido en la fase 1 de idiomas: sin ciudad de destino solo muestra el estado;
  - la dirección de bodega del casillero sigue siendo el marcador «Dirección de bodega en Miami por confirmar» (`src/lib/config/company.ts`), que ven los clientes en su panel. A&L recibe en El Paso y Chicago;
  - el mapa es fijo, con la ruta Miami → Nuevo Laredo → centro de México, que no es la de A&L;
  - la entrega estimada sale vacía («— de mes»);
  - no es GPS y las notas no se publican. Una pieza que se recoge en otra ciudad (p. ej. una moto en Oklahoma registrada en El Paso) aparece «En bodega» desde que se registra. Valorar con el cliente una etapa «Pendiente de recolección» o una nota pública.
- [ ] **Año fijo en los códigos** `BX-26…`, `SH-26…`, `AL-26-…`, `BOL-26…` y `TR-26…` (`client-actions.ts`, `admin-actions.ts`, `file-actions.ts`, `document-sequence.ts`, `bill-of-lading-actions.ts`). Decidir antes del 2026-12-31 si «26» es el año. Además, `warehouse-actions.ts:40` genera `BX-<uuid8>`, otro formato.
- [ ] **Escalabilidad de `withStore`:** cada solicitud carga toda la tabla `entities` (1.462 documentos el 2026-11-06), y `/admin/facturas` y `/admin/clientes` ya generan más de 1 MB de HTML. Pasar a tablas propias primero las colecciones que más crecen (`notifications`, `boxes`, `invoices`), o paginar.
- [ ] **El test de integración falla contra MySQL 5.7** (`changeUser` de mysql2 no reenvía la contraseña, en `tests/integration.test.ts:99`). En 8.0 pasa. Cambiarlo por `USE` si vuelve a usarse la 5.7.
- [ ] **Sin formateador:** hay líneas de hasta 8.800 caracteres. Valorar Prettier, en un commit de reformateo aparte.
- [ ] **Documentos antiguos desactualizados:** `DECISIONS.md` (datos en memoria), `DESPLIEGUE-SERVIDOR.md` (MySQL 5.7.39, Node 24) y `clover.md` (dice que está deshabilitado y en producción está activo). También hay PDF y PNG versionados en `tmp/` y `output/`.

### Local
- [ ] **FileVault está desactivado en la Mac** (comprobado el 2026-11-07 con `fdesetup status`). El disco guarda sin cifrar los respaldos completos de producción (`~/Respaldos/ayl-produccion/`) y la copia saneada, que tiene datos reales de clientes. Activarlo en Ajustes del Sistema → Privacidad y seguridad → FileVault.
- [ ] La base antigua `ayl_real` de la MySQL 5.7 (3307) quedó en desuso (4 cuentas de prueba). Borrarla cuando se confirme.
- [ ] Valorar versionar `.local/sanear-copia-local.mjs` como script del proyecto.

### Negocio (supuestos de DECISIONS.md; confirmar si siguen vigentes)
- [ ] Dirección de la bodega de Miami, teléfono y correo de soporte, aviso de privacidad y términos.
- [ ] Cobertura, zonas, tiempos de tránsito, tarifas de entrega a domicilio, seguro y tipo de cambio.
- [ ] Emisión fiscal (CFDI) y datos fiscales del emisor; los PDF actuales no son comprobantes fiscales.
- [ ] Responsable y tiempo de respuesta (SLA) de los tickets de soporte.

## Hecho
- 2026-11-20: limpieza de operaciones en producción (se conservan clientes y destinatarios) y numeración de camiones con secuencia protegida (`4db2ce6`, desplegado). Hubo respaldo verificado antes de cada paso.
- 2026-11-20: despliegue en producción del bill of lading editable, de `docs/` y de los scripts `deploy.sh` y `respaldo-produccion.sh` (commits `4959f02` y `32d2a30`), con respaldo previo verificado.
- 2026-11-08: bill of lading editable con el formato VICS del cliente: se crea desde un camión o en blanco, la carga va por cantidad (cajas juntas y vehículos aparte) y las *Special Instructions* se editan. El PDF por pieza pasa a llamarse «Manifiesto de carga».
- 2026-11-07: regla de no tocar cargo salvo en despliegues planificados. `scripts/respaldo-produccion.sh` y primer respaldo de producción, verificado. `deploy.sh` versionado como `scripts/deploy.sh`.
- 2026-11-06: análisis del proyecto. Entorno local integrado con producción (MySQL 8 y copia saneada). Estructura de `docs/` (arquitectura, decisiones, progreso). `deploy.sh` traído del servidor.
- 2026-10-03: recepciones mixtas (varios conceptos), direcciones de destinatario en etiquetas, inventario de almacén y edición de la entrega por paquete.
- 2026-10-02: carga del camión directamente desde el inventario del almacén; formularios adaptables.
- 2026-09-30: cajas de precio fijo combinadas, pagos con cheque, edición de facturas y retiro recuperable de cajas duplicadas.
- 2026-09-29: cotización pública alineada con el cobro por volumen, catálogo de cajas fijas, nota de contenido, referencias de recolección.
- 2026-09-26/28: limpieza de pruebas para el administrador completo, contacto opcional del cliente y recepción personalizada.
- 2026-09-25: Clover (Hosted iFrame con protección de cargos), permisos por sección, PWA instalable y push.
- 2026-09-22: compresión de fotos y almacenamiento privado en R2.
- 2026-09-21: cobro de recepción por peso o volumen y nuevas etiquetas.
- 2026-09-15/17: correcciones de recepción agrupada, vales térmicos y correos de recibo estructurados.
- 2026-09-13: recepción multipaquete, carga de camiones y *bill of lading*.
- 2026-09-12: operación completa en MySQL, almacenes de origen y destino, importación de ubicaciones y operadores, guía de despliegue.
- 2026-09-02: demo completo en fases 0 a 6 (landing, autenticación, rastreo, panel del cliente, panel operativo), rediseño editorial y auditoría.
