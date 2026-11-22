# Arquitectura

_Revisado el 2026-11-06 contra el código (commit `f02c21d`) y el servidor de producción._

## Visión general

Una sola aplicación Next.js (App Router) que sirve el sitio público, los paneles y las rutas API, y un segundo proceso Node (`scripts/email-worker.mjs`) que vacía las colas de correo y push. Todo el estado vive en MySQL.

Conceptos del dominio (detalle en [FLUJO-DEL-SISTEMA.md](FLUJO-DEL-SISTEMA.md)):

- **Caja o paquete:** la unidad física, con código `BX-…`, etiqueta y estado (`pre-alertada` → `recibida` → `en-bodega` → `cargada-en-camion` → `en-transito` → `en-destino` → `entregada`).
- **Recepción:** el alta en un almacén de origen. Puede agrupar varias piezas y conceptos de cobro con un solo número.
- **Envío** (`SH-…`): agrupa las cajas de un cliente para un destinatario.
- **Camión o guía máster:** un origen y una o varias paradas de destino, con manifiesto de carga (una fila por pieza).
- **Bill of lading:** documento editable con el formato *short form* (VICS) del transportista. Se crea desde un camión (carga agrupada por cantidad) o en blanco, y se guarda en `billsOfLading`. Ver [BILL-OF-LADING.md](BILL-OF-LADING.md).
- **Factura** (`AL-26-…`) y **pagos:** efectivo, Zelle, cheque o Clover. Un reporte de pago del cliente se revisa antes de aprobarse.
- **Almacenes:** de origen, de destino o ambos. Los **operadores** solo ven su ubicación y nunca ven tarifas ni cobros.

Los cambios de estado pasan por `src/lib/domain/state-machine.ts`.

## Superficies

| Grupo | Rutas | Quién |
|---|---|---|
| `(marketing)` | `/`, `/como-funciona`, `/rastrear/[codigo]` | Público (cotizador, rastreo) |
| `(auth)` | `/login`, `/registro`, `/verificar`, `/recuperar`, `/restablecer` | Público |
| `(cliente)` | `/cliente/*`: cajas, envíos, prealertas, destinatarios, direcciones, facturas, estado de cuenta, cotizador, soporte, notificaciones, cuenta | Rol `cliente` |
| `(admin)` | `/admin/*`: recepción, recepción en destino, bodega, almacenes, camiones, entregas, clientes, cajas, prealertas, pendientes, facturas, soporte, usuarios, configuración, correos, edición, eliminar | Rol `admin`: completo o por secciones ([permisos-administrativos.md](permisos-administrativos.md)) |
| `(almacen)` | `/almacen` | Rol `operador`, limitado a su ubicación |
| Otras | `/etiquetas/[id]` (etiquetas térmicas), `/sin-acceso`, `/design` (catálogo de UI) | — |
| API | `/api/facturas/[id]/pdf`, `/api/recepciones/[id]/recibo`, `/api/camiones/[id]/manifiesto`, `/api/bill-of-lading/[id]`, `/api/files/[id]` (archivos privados), `/api/emails/preview`, `/api/internal/email-worker` (HMAC), `/api/webhooks/resend` (firma Svix) | — |

`src/proxy.ts` solo redirige a `/login` si falta la cookie. La autorización real se hace en el servidor, en cada página y en cada acción.

## Código (`src/lib`)

| Carpeta | Qué contiene |
|---|---|
| `auth/` | Server Actions por área (`admin-actions`, `client-actions`, `warehouse-actions`, `file-actions`, `invoice-actions`, `clover-actions`…), sesiones (`session.ts`), scrypt y tokens (`crypto.ts`), permisos por sección (`admin-permissions.ts`) |
| `db/` | Pool de MySQL, `store.ts` (`withStore`), `collections.ts`, `mutation.ts` (`runMutation`) y `document-sequence.ts` (numeración de documentos) |
| `domain/` | Máquina de estados y guía de flujo |
| `services/` | Lecturas de logística, correo (cola cifrada), push, rastreo, configuración y plantillas de correo |
| `pdf/` | Factura, manifiesto de carga, *bill of lading* (VICS short form), recibos térmicos de 80 mm (`@react-pdf/renderer`) |
| `files/` | Validación por los primeros bytes (PNG, JPEG, PDF), normalización con `sharp` y cliente de R2 |
| `payments/` | Clover (Hosted iFrame) |
| `schemas/` | Validación con Zod |
| `utils/` | Cobros, facturas, piezas y conceptos de recepción, carga del camión, etiquetas |
| `config/` | Categorías de caja, estados, empresa, ubicaciones y catálogo postal de México |
| `i18n/` | Idioma (español e inglés). Ver [idiomas.md](idiomas.md). Contiene:<br>• detección (`negotiate.ts`);<br>• `getLocale`/`getT` en servidor y `useT` en cliente;<br>• el selector (`actions.ts`);<br>• los catálogos de interfaz por área en `catalogs/`;<br>• los mensajes de las Server Actions en `messages/`, que traduce `runMutation` con `localize-result.ts`;<br>• el idioma de cada destinatario (`user-locale.ts`). |

## Datos

Las migraciones están en `migrations/` (001 a 007) y se aplican con `npm run db:migrate`, que registra cada una en `schema_migrations`.

- **Tablas relacionales:** `accounts`, `sessions`, `auth_tokens`, `rate_limits`, `security_audit`, `email_outbox` (cifrada con `AUTH_SECRET`), `email_events`, `push_subscriptions`, `push_outbox`, `private_files` (fotos y comprobantes; contenido en MySQL o referencia a R2).
- **`entities`:** el resto del dominio como documentos JSON (`collection_name`, `entity_id`, `payload`). Colecciones: `users`, `boxes`, `invoices`, `shipments`, `trucks`, `drivers`, `warehouses`, `addresses`, `recipients`, `notifications`, `receptionRequests`, `supportTickets`, `settings`, `documentSequences` (folios BX, AL, SH, BOL y TR; nunca se reutilizan), `billsOfLading`, `deletionHistory`, `cloverAttempts`, etc.
- **`withStore`** abre una transacción y **carga toda la tabla `entities`** en memoria. Si escribe, bloquea antes `operation_lock` (`FOR UPDATE`), lo que serializa todas las escrituras, y al final guarda solo los documentos que cambiaron. Es simple y consistente, pero su coste crece con el volumen (ver docs/progreso.md).

Volumen en producción el 2026-11-06 (unos 5 MB):

| Datos | Cantidad |
|---|---|
| Cuentas | 92 (86 clientes, 4 administradores, 2 operadores) |
| Cajas y facturas | 228 de cada una |
| Notificaciones | 691 |
| Solicitudes de recepción | 95 |
| Destinatarios | 83 |
| Camiones | 7 |
| Almacenes | 5 |
| Archivos privados | 7 |

## Integraciones

| Servicio | Uso | Variables |
|---|---|---|
| Resend | Correo transaccional; webhook de estados de entrega | `EMAIL_DELIVERY` (`preview` = no envía), `RESEND_*` |
| Clover | Cobro con tarjeta (Hosted iFrame) | `CLOVER_ENABLED`, `CLOVER_ENVIRONMENT`, `CLOVER_*` ([clover.md](clover.md)) |
| Cloudflare R2 | Fotos de recepción nuevas (opcional) | `PHOTO_STORAGE=r2`, `R2_*`, `R2_PRIVATE_CONFIRMED` ([fotos-r2.md](fotos-r2.md)) |
| Web Push | Avisos de la PWA | `PUSH_ENABLED`, `VAPID_*` ([pwa.md](pwa.md)) |

## Despliegue (producción)

| Qué | Valor |
|---|---|
| Servidor | `cargo` (VPS Ubuntu 24.04 en Hetzner). Se trabaja con `ssh cargo-deploy` (usuario `deployer`) |
| Ruta | `/var/www/trucking`, clonado de `github-trucking:eamonfq/trucking.git` (alias SSH del servidor con la llave `~/.ssh/github_trucking` de `deployer`), rama `master` |
| Procesos | PM2 de `deployer`: `truckingayl` (`npm start` → `next start` en `127.0.0.1:3100`) y `truckingayl-worker` (`npm run email:worker`) |
| Web | nginx (`/etc/nginx/sites-available/altruckinglogistics.com` y `truckingayl.vecility.com`) hace de proxy a `127.0.0.1:3100` |
| Node | 22.23.4 |
| Base | MySQL 8.0.46, base `ayl_real`, usuario `ayl_app@127.0.0.1` con privilegios solo sobre `ayl_real`; `sql_mode` por defecto de 8.0 y `utf8mb4_0900_ai_ci` |

**Variables:** hay tres archivos, `.env`, `.env.production` y `.env.local`. Next aplica `.env.local` por encima de `.env.production` y de `.env`, y dentro de un archivo gana la última línea de una clave repetida. Valores efectivos no secretos el 2026-11-06:

- `NEXT_PUBLIC_SITE_URL=https://altruckinglogistics.com`
- `EMAIL_DELIVERY=resend`
- `CLOVER_ENABLED=true` con `CLOVER_ENVIRONMENT=production`
- `TRUST_PROXY=true`
- `SEO_INDEXABLE=false`: `robots.txt` responde `Disallow: /`
- `PHOTO_STORAGE` sin definir (fotos en MySQL); Push no está activado
- `PORT=3060` no se usa, porque `next start --port 3100` lo fija

**Regla (2026-11-07):** producción tiene datos reales y funciona. Cargo solo cambia mediante un despliegue planificado y probado antes en local, siempre con un respaldo justo antes. No se edita nada a mano en el servidor: `.env`, PM2, nginx, Node.

**Desplegar:**

1. En la Mac: `scripts/respaldo-produccion.sh` (ver [Respaldos](#respaldos)).
2. `ssh cargo-deploy`, y luego `cd /var/www/trucking && ./deploy.sh`. El script que usa el servidor está en la raíz, sin seguimiento en git; `scripts/deploy.sh` es su copia versionada, idéntica. Hace:
   1. `git pull --ff-only`
   2. `npm ci --include=dev`
   3. `npm run db:migrate`
   4. `npm run build`
   5. `pm2 restart truckingayl truckingayl-worker` y `pm2 save`
   6. Comprueba que `http://127.0.0.1:3100/admin` responda 200, 302 o 307

## Respaldos

`scripts/respaldo-produccion.sh` se ejecuta **en la Mac**:
- En el servidor solo lee: lanza `mysqldump --single-transaction` por SSH, que no bloquea tablas, y no deja archivos allí.
- Guarda `ayl_real-<fecha UTC>.sql.gz` y su `.sha256` en `~/Respaldos/ayl-produccion/` (carpeta 700, archivos 600).
- Descarta los dumps incompletos y conserva los 30 más recientes (`AYL_RESPALDOS_CONSERVAR`).

Además:
- **Primer respaldo: 2026-11-07.** Se comprobó restaurándolo en una base temporal: mismas filas que producción en todas las tablas y SHA-256 correcto en los 7 archivos privados.
- Es un respaldo **completo** (hashes de contraseña, sesiones, cola cifrada): no se usa como base de desarrollo; para eso está la [copia saneada](#copia-local).
- Solo existe en la Mac, y la Mac no tiene FileVault activado (ver docs/progreso.md). No hay respaldos en el servidor ni programados.
- `scripts/backup-database.mjs` guarda el respaldo **en el servidor**; no usarlo en cargo, por la regla de arriba.
- **Restaurar en producción** es siempre una decisión explícita. Primero se prueba el respaldo en una base temporal local. El dump trae `DROP TABLE IF EXISTS` por tabla, así que importarlo sobre `ayl_real` la reemplaza entera; antes hay que parar `truckingayl` y `truckingayl-worker`.

## Copia local

La base local (`ayl_real` en la MySQL 8.0 de esta Mac, puerto 3306) es una **copia saneada de producción**:

- **Se borra:** sesiones, tokens, límites de intentos y las colas de correo y push.
- **Se reemplaza:** todos los correos, en `accounts` y dentro del JSON de `entities`, por `<rol>-<n>@example.invalid` o `contacto-<n>@example.invalid`.
- **Se cambia:** todas las cuentas comparten una contraseña local, guardada en `.local/acceso-local.txt` (no versionado, permisos 600). Los hashes reales no se copian.
- **Se conserva:** nombres, teléfonos, direcciones, facturas, fotos y numeración de documentos.

Para regenerarla (**sobrescribe `ayl_real` local**):

```sh
cd ~/dev/proyectos/ayl
# 1) Respaldo nuevo (o usar el último que ya exista)
scripts/respaldo-produccion.sh
F=$(ls -1t ~/Respaldos/ayl-produccion/ayl_real-*.sql.gz | head -1)
# 2) Recrear e importar
mysql -P 3306 -e 'DROP DATABASE IF EXISTS ayl_real; CREATE DATABASE ayl_real CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci'
gzip -dc "$F" | mysql -P 3306 ayl_real
# 3) Sanear: si queda algún correo real, falla y deshace todo
node .local/sanear-copia-local.mjs "$PWD"
```

`.local/sanear-copia-local.mjs` no está versionado (`.local/` está en `.gitignore`).

## Documentos por tema

| Documento | Tema |
|---|---|
| [FLUJO-DEL-SISTEMA.md](FLUJO-DEL-SISTEMA.md) | Mapa del flujo real por responsable |
| [AUTH-REAL.md](AUTH-REAL.md) | Autenticación, persistencia en MySQL y correo |
| [RECEPCION-Y-PAGOS.md](RECEPCION-Y-PAGOS.md), [cobro-recepcion.md](cobro-recepcion.md) | Recepción, alta y modalidades de cobro |
| [RECEPCION-MULTIPAQUETE.md](RECEPCION-MULTIPAQUETE.md), [recepcion-personalizada.md](recepcion-personalizada.md), [recepciones-mixtas.md](recepciones-mixtas.md) | Recepción con varias piezas, tarifa por libra manual y varios conceptos |
| [ALMACENES-ORIGEN-DESTINO.md](ALMACENES-ORIGEN-DESTINO.md), [ALMACENES-Y-ESCANEO.md](ALMACENES-Y-ESCANEO.md), [ALMACENES-Y-PAGOS-CONFIRMADOS.md](ALMACENES-Y-PAGOS-CONFIRMADOS.md), [IMPORTAR-ALMACENES-Y-USUARIOS.md](IMPORTAR-ALMACENES-Y-USUARIOS.md) | Almacenes, operadores y escaneo |
| [CARGA-CAMIONES.md](CARGA-CAMIONES.md), [BILL-OF-LADING.md](BILL-OF-LADING.md) | Capacidad del camión, manifiesto de carga y *bill of lading* editable |
| [clover.md](clover.md), [fotos-r2.md](fotos-r2.md), [pwa.md](pwa.md) | Integraciones |
| [permisos-administrativos.md](permisos-administrativos.md), [limpieza-pruebas-y-contacto-opcional.md](limpieza-pruebas-y-contacto-opcional.md) | Permisos, eliminación de pruebas y contacto opcional |
| [DESPLIEGUE-SERVIDOR.md](DESPLIEGUE-SERVIDOR.md) | Guía de instalación original (anterior a esta revisión; dice MySQL 5.7) |
| [DESIGN.md](DESIGN.md), [SEO-HOME.md](SEO-HOME.md) | Sistema de diseño y SEO de la portada |
| [AUDIT.md](AUDIT.md), [AUDITORIA-FLUJO-2026-09-13.md](AUDITORIA-FLUJO-2026-09-13.md), [VALIDACION-OPERATIVA.md](VALIDACION-OPERATIVA.md) | Auditorías y validación (históricas) |
| [DECISIONS.md](DECISIONS.md) | Decisiones del demo inicial; las nuevas van en [decisiones.md](decisiones.md) |
