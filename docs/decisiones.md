# Decisiones

Una entrada por decisión, la más reciente arriba. Las entradas no se borran: si una decisión cambia, se añade otra que la reemplaza. Las entradas anteriores al 2026-11-06 resumen los documentos por tema, que conservan el detalle.

## 2026-11-20 — Todo el sistema en dos idiomas: lo que se envía a una persona va en su idioma
**Decisión:**
- El panel del cliente, el admin y el almacén también se traducen al inglés. El dueño confirmó que el equipo usará el admin en inglés.
- Los mensajes que devuelven las Server Actions se traducen en un solo punto, `runMutation()`, según el idioma de quien hace la petición. Las acciones siguen escribiendo español, y los catálogos de `src/lib/i18n/messages/` admiten `{marcadores}`.
- **Lo que se envía o se genera para una persona sale en el idioma de esa persona** (`users.preferredLocale`), aunque lo dispare un operador en otro idioma: correos, push, avisos del panel, factura y recibo de recepción. Lo puede fijar el admin en la ficha del cliente y en el alta en mostrador (español por defecto). Las cuentas antiguas sin preferencia guardan la del primer acceso.
- **La etiqueta del paquete y el manifiesto de carga son bilingües**, porque cruzan la frontera. **El bill of lading queda en inglés** (formato VICS).
- El historial que guarda el código en español se traduce al mostrarlo, frase por frase. Lo que escribe una persona no se traduce.

**Motivo:**
- El dueño lo pidió: «admin usará inglés», «el inglés lo revisas tú según la lógica de negocio» y «facturas en inglés o español según idioma».
- Traducir en `runMutation` evita tocar cientos de `return { error }`. Además, esos mensajes no viajan al navegador, porque los catálogos de mensajes solo los importa el servidor.
- Componer al crear, y no al mostrar, garantiza que un correo, un push o un PDF salgan siempre en el mismo idioma que la persona eligió.
- Una etiqueta bilingüe la entienden en El Paso y en México; una en el idioma de quien imprime, no.

**Reemplaza:** amplía la entrada del mismo día sobre el sitio en español e inglés (fase 1).

## 2026-11-20 — Sitio en español e inglés: idioma por cookie y el español como clave de traducción
**Decisión:**
- El idioma se guarda en la cookie `ayl_lang` y, con sesión, en `users.preferredLocale`. Prioridad: elección del usuario, después el idioma del navegador y, si no hay nada, español.
- Las URLs **no** llevan prefijo de idioma.
- Las traducciones son catálogos propios en TypeScript (`src/lib/i18n/catalogs/`), sin librería. La clave es el texto en español y el valor, el inglés. `t()` solo acepta claves existentes, así que una traducción faltante no compila.
- Se avanza por fases desplegables por separado (ver [idiomas.md](idiomas.md)).

**Motivo:**
- Prefijo `/en/...` descartado: obligaba a reescribir el proxy, las redirecciones de login (`siguiente`) y todos los enlaces internos. Además rompía los enlaces de rastreo ya compartidos y solo sirve para Google, y el sitio hoy no se indexa.
- `next-intl` descartado: con dos idiomas y textos simples no compensa una dependencia más que validar contra cada versión de Next.
- Claves por identificador (`admin.reception.save`), como proponía el plan inicial, descartadas: los componentes son líneas de miles de caracteres, y con el español como clave se migra archivo por archivo sin perder legibilidad ni crear claves huérfanas.

**Consecuencia:**
- Cambiar un texto en español obliga a cambiar también su clave en el catálogo; `tsc` lo detecta.
- Los mensajes que llegan en tiempo de ejecución (errores de Server Actions y de Zod) se traducen al mostrarlos y, si falta uno, se ven en español.

## 2026-11-20 — Producción se vacía de operaciones; se conservan clientes y destinatarios
**Decisión:** a pedido del dueño se borró en producción todo lo operativo:
- recepciones y cajas (229), facturas con sus pagos (229), camiones (7) y Bill of Lading (2);
- notificaciones, solicitudes de recepción, intentos de Clover, historial de borrados anteriores y las 8 fotos (estaban en MySQL, no en R2).

Se conservaron:
- clientes (83), destinatarios (84) y direcciones;
- el personal (4 administradores), los choferes, los almacenes y la configuración;
- las tablas de cuentas, sesiones y auditoría.

Los folios **continúan** (siguientes: BX-260230, AL-26-0258, TR-260108, BOL-260003) para no repetir un código ya impreso.
**Cómo:** con un script de un solo uso (`.local/limpieza-2026-11-20/limpiar-operacion.cjs`, no versionado), probado antes en una copia local. Se ejecuta por SSH desde la Mac, sin dejar archivos en el servidor, en dos pasos: vista previa con conteos y ejecución con esos conteos como confirmación. Toma el mismo candado que la app (`operation_lock`), fija las secuencias antes de borrar y registra `operational_data_cleanup` en `security_audit`. Respaldo previo verificado: `~/Respaldos/ayl-produccion/ayl_real-20261120T213939Z.sql.gz`.
**Motivo:** el dueño quiere empezar la operación desde cero sin volver a dar de alta a sus clientes. Se descartó `/admin/eliminar`, que borra una recepción a la vez, y se aceptó perder el registro de los cobros en el sistema: los cobros siguen en Clover. Es una excepción explícita a la regla del 2026-11-07, autorizada por el dueño ese día.
**Consecuencia:** el número de camión pasó a la secuencia protegida (`documentSequences`, tipo `truck`, commit `4db2ce6`). Antes se calculaba con el número de camiones existentes, y al borrarlos el siguiente habría vuelto a ser TR-260101.

## 2026-11-08 — Bill of lading editable con el formato del cliente
**Decisión:**
- El *bill of lading* es un documento propio, guardado (`billsOfLading`) y editable, con el formato *Short Form* (VICS) que el cliente usa en papel. Se crea desde un camión o en blanco.
- La carga va **por cantidad**: las cajas comunes en una fila, y cada vehículo (nota con VIN) en su fila. Las *Special Instructions* y el resto de campos de la muestra se editan.
- El PDF anterior del camión, con una fila por pieza, se conserva como «Manifiesto de carga» para verificar la carga.

**Motivo:** el cliente pidió poder crear el BOL, ver cantidades en vez del detalle de 20 o 30 cajas y llenar las instrucciones especiales. Su muestra (2026-09-12, 222 cajas y 7 vehículos) estaba hecha a mano porque el PDF del sistema no lo permitía. Se descartó un formulario sin guardar porque no deja corregir ni consultar los anteriores. Detalle en [BILL-OF-LADING.md](BILL-OF-LADING.md).
**Reemplaza:** el «Bill of Lading operativo» generado desde el camión, con formato propio y sin copiar los textos del formato de referencia (BILL-OF-LADING.md, 2026-09-13). Ahora el PDF reproduce los textos estándar del formulario VICS, como la muestra del cliente.

## 2026-11-07 — Cargo solo cambia mediante despliegues planificados
**Decisión:** en el servidor de producción no se cambia nada a mano: ni `.env`, ni PM2, ni nginx, ni Node. Solo cambia mediante `./deploy.sh`, con código probado en local y un respaldo hecho justo antes. Los pendientes de configuración del servidor (`.env` duplicados, `PORT`, Node 22, `noindex`) esperan a un despliegue planificado o a una decisión explícita.
**Motivo:** producción tiene datos reales y funciona; un cambio que no es necesario hoy solo añade riesgo. Se mantiene pendiente, como decisión del dueño, el `chmod 600` de `.env` y `.env.production`, que no cambia el funcionamiento.

## 2026-11-07 — Respaldos de producción hacia la Mac
**Decisión:** `scripts/respaldo-produccion.sh` saca el respaldo desde la Mac. En el servidor solo lee (`mysqldump --single-transaction` por SSH) y no deja archivos allí. Guarda en `~/Respaldos/ayl-produccion/` y conserva los 30 más recientes. Es obligatorio antes de cada despliegue.
**Motivo:** no había ningún respaldo, y se quiere resolver sin instalar ni programar nada en cargo. Se descartaron `scripts/backup-database.mjs` (guarda en el servidor) y el cron en cargo. Límites: depende de que alguien lo ejecute, y la copia queda en una Mac sin FileVault.

## 2026-11-07 — `deploy.sh` versionado como `scripts/deploy.sh`
**Decisión:** la copia versionada del script de despliegue va en `scripts/deploy.sh`, idéntica a la del servidor. El servidor sigue usando su `./deploy.sh` de la raíz, sin seguimiento.
**Motivo:** en la raíz del repo, el siguiente `git pull` del servidor fallaría por el archivo sin seguimiento, y habría que tocar cargo para moverlo. En `scripts/` no choca con nada.
**Reemplaza:** 2026-11-06, «`deploy.sh` versionado en el repositorio».

## 2026-11-06 — `deploy.sh` versionado en el repositorio
**Decisión:** el script de despliegue que solo existía en el servidor (`/var/www/trucking/deploy.sh`, sin seguimiento en git) se añade al repo sin cambios.
**Motivo:** que el procedimiento de despliegue quede versionado y revisable. No contiene secretos.
**Consecuencia:** el primer `git pull` en el servidor después del commit falla («untracked working tree files would be overwritten») mientras exista la copia sin seguimiento. Hay que moverla una vez (ver docs/progreso.md).

## 2026-11-06 — Desarrollo local en MySQL 8 con una copia saneada de producción
**Decisión:** la base local de trabajo es `ayl_real` en la MySQL 8.0 de la Mac (3306), copiada de producción y saneada:
- se borran sesiones, tokens, límites y colas de correo y push;
- todos los correos pasan a `@example.invalid`;
- todas las cuentas comparten una contraseña local, sin los hashes reales.

Se conservan nombres, teléfonos, direcciones, facturas y fotos.
**Motivo:** producción corre en MySQL 8.0.46, no en 5.7, y trabajar con los datos reales permite reproducir los flujos tal como se usan. Al cambiar los correos, nada puede llegar a un cliente aunque se active el envío en local. Con MySQL 8, además, pasan los 85 tests de integración, que fallaban en la 5.7 local. Se descartaron una copia idéntica (riesgo de correos reales) y una base vacía (poco realista).
**Reemplaza:** el entorno local en MySQL 5.7, heredado de Laragon (DESPLIEGUE-SERVIDOR.md, 2026-09-12).

## 2026-10-03 — Recepciones con varios conceptos
**Decisión:** una recepción puede mezclar conceptos con precio, pesaje o modalidad distintos. El redondeo a la libra se aplica una vez por concepto, y el peso y el costo no se reparten entre conceptos.
**Motivo:** cargas mixtas reales (p. ej. una moto a precio acordado y cajas por libra). Detalle en [recepciones-mixtas.md](recepciones-mixtas.md).

## 2026-09-28 — Recepción personalizada sin alterar tarifas
**Decisión:** «Carga especial · tarifa por libra» usa una tarifa manual solo para esa recepción. El peso conjunto se redondea una vez y se prorratea entre las piezas, marcado como peso prorrateado.
**Motivo:** cobrar acuerdos puntuales sin cambiar la tarifa general ni las facturas históricas. Detalle en [recepcion-personalizada.md](recepcion-personalizada.md).

## 2026-09-26 — Contacto opcional y eliminación controlada de pruebas
**Decisión:**
- El correo y la dirección del cliente son opcionales (correo `NULL` en `accounts`); son obligatorios el nombre, el apellido y el teléfono.
- `/admin/eliminar` queda reservado al administrador completo, con vista previa, motivo y confirmación escrita, y guarda un respaldo en `deletionHistory`.

**Motivo:** muchos clientes llegan al mostrador sin correo, y había que limpiar los datos de prueba sin borrar en masa. Detalle en [limpieza-pruebas-y-contacto-opcional.md](limpieza-pruebas-y-contacto-opcional.md).

## 2026-09-25 — Permisos administrativos por sección
**Decisión:** los administradores reciben secciones concretas (el perfil propuesto es Recepción). El «administrador completo» tiene todo, y el sistema no puede quedarse sin uno activo.
**Motivo:** separar a recepción de la facturación y la configuración. Detalle en [permisos-administrativos.md](permisos-administrativos.md).

## 2026-09-25 — PWA instalable sin caché sin conexión
**Decisión:** el service worker solo usa la red y no guarda páginas privadas, archivos ni respuestas de la API. Las notificaciones push acompañan a los correos operativos.
**Motivo:** que nunca quede información privada en el dispositivo. Detalle en [pwa.md](pwa.md).

## 2026-09-25 — Clover con Hosted iFrame
**Decisión:** el cobro con tarjeta usa el formulario alojado de Clover (los datos de la tarjeta no pasan por el servidor) y protege contra cargos duplicados. Se activa por variable (`CLOVER_ENABLED`).
**Motivo:** reducir el alcance de PCI y evitar cargos dobles al reintentar. Detalle en [clover.md](clover.md). A 2026-11-06 está activo en producción.

## 2026-09-22 — Fotos comprimidas y almacenamiento privado opcional en R2
**Decisión:** las fotos se comprimen en el navegador y se normalizan en el servidor: se quitan los metadatos y el tamaño máximo es 2 MB. Pueden ir a R2 (`PHOTO_STORAGE=r2`), y se descargan siempre por `/api/files/[id]`, con sesión.
**Motivo:** fotos de tablet pesadas y que no exista ninguna URL pública. Detalle en [fotos-r2.md](fotos-r2.md).

## 2026-09-21 — Modalidades de cobro de recepción
**Decisión:** hay tres modalidades:
- peso real, redondeado a la libra × tarifa;
- volumen, con resultado directo en USD;
- carga especial, a precio acordado.

Las facturas emitidas no se recalculan.
**Motivo:** alinear el cobro con la operación real. Detalle en [cobro-recepcion.md](cobro-recepcion.md).

## 2026-09-12 — Almacenes de origen y destino separados
**Decisión:** cada ubicación es de origen, de destino o ambos. Los operadores ven solo su ubicación y nunca ven facturas, tarifas ni cobros.
**Motivo:** reflejar las rutas reales (Chicago y El Paso → Valle de Juárez). Detalle en [ALMACENES-ORIGEN-DESTINO.md](ALMACENES-ORIGEN-DESTINO.md).

## 2026-09-05 — Persistencia real en MySQL y autenticación propia
**Decisión:**
- Datos en MySQL: el dominio va como documentos JSON en `entities`, con una transacción por solicitud y escrituras serializadas con `operation_lock`.
- Cuentas, sesiones y tokens en tablas propias: scrypt, tokens opacos guardados como SHA-256 y sesiones revocables.
- Correo en una cola cifrada.

**Motivo:** pasar del demo a un sistema operativo conservando los servicios del demo. Detalle en [AUTH-REAL.md](AUTH-REAL.md).
**Reemplaza:** «las mutaciones del demo viven en memoria» (DECISIONS.md, punto 7, 2026-09-02).

## 2026-09-02 — Decisiones del demo inicial
**Decisión:** los 20 puntos de [DECISIONS.md](DECISIONS.md). Entre ellos:
- Diseño: naranja para la acción principal y azul marino para la navegación; fuentes autoalojadas.
- Todo importe sale de la categoría de caja; el peso solo es un límite.
- Fechas en UTC.
- Toda mutación en Server Actions, con la identidad tomada de la cookie.
- Las notas internas nunca llegan al cliente.
- Estados a través de la máquina de estados.

**Motivo:** el que se explica en cada punto de ese documento. Sus «supuestos pendientes» siguen en docs/progreso.md.
