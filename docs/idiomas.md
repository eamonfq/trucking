# Idiomas: español e inglés

Pedido del cliente (2026-11-20): el sitio en inglés y en español, tanto la parte pública como el panel. El idioma se detecta según el navegador y se puede cambiar desde el sitio y desde el admin. Decisión en [decisiones.md](decisiones.md).

## Cómo se elige el idioma

1. **Cookie `ayl_lang`** (`es` | `en`): la elección del selector ES | EN en este navegador. Dura 1 año, no es `httpOnly` y es independiente de la sesión, así que se conserva al cerrar sesión.
2. **Idioma del navegador** (`Accept-Language`), respetando los pesos `q`: `en-US` → `en`, `es-419` → `es`.
3. **Español** si no hay nada de lo anterior.

Las URLs no cambian: `/rastrear/BX-…` y los enlaces de los correos funcionan igual en los dos idiomas.

**Preferencia del usuario** (`users.preferredLocale`, en el documento JSON; sin migración):
- Se guarda al usar el selector con sesión iniciada y al registrarse, con el idioma de la petición.
- Al iniciar sesión, si el usuario tiene preferencia, se escribe en la cookie: en un dispositivo nuevo entra en su idioma. Si no tiene (cuentas anteriores a los idiomas), se guarda el idioma de ese acceso.
- Decide el idioma de lo que se le envía o se genera para esa persona: correos, push, avisos del panel, factura y recibo de recepción (`userLocale(user)`, `src/lib/i18n/user-locale.ts`). Se compone en su idioma al crearlo, aunque lo dispare un operador en otro idioma.

**Documentos:**
- La factura y el recibo de recepción salen en el idioma del cliente, también cuando los descarga el admin.
- La etiqueta térmica y el manifiesto de carga son bilingües (encabezados «Español / English»): cruzan la frontera y los leen en los dos lados.
- El bill of lading sigue el formato VICS en inglés.

## Cómo se traduce (para el código)

- Los textos se escriben en español, como siempre. El español es la clave y el inglés va en un catálogo por área: `src/lib/i18n/catalogs/*.ts`, objetos `{ "Texto en español": "English text" } as const`.
- **Componentes de servidor:** `const t = await getT(catalogo)` (`@/lib/i18n/server`).
- **Componentes de cliente:** `const t = useT(catalogo)` (`@/lib/i18n/provider`).
- **Código sin React**, como el PDF o un componente que sirve en los dos lados: `translator(catalogo, locale)`.
- `t("Texto")` solo acepta claves que existen en el catálogo: **si falta la traducción, `tsc` falla**. Las variables se marcan con `{nombre}`, como `t("Tu casillero es {code}", { code })`.
- **Mensajes de las Server Actions:** `runMutation()` los traduce al devolver el resultado (campos `error`, `message`, `detail`, `warning(s)`, `notice`, `errors`), con el idioma de la petición y los catálogos de `src/lib/i18n/messages/*.ts`.
  - El código de las acciones sigue devolviendo español. Para traducir un mensaje nuevo, basta con añadirlo al catálogo de su área.
  - Las claves admiten `{marcadores}` como patrones: «La caja {code} ya está cargada.» traduce cualquier código. Si un mensaje no está en el catálogo, se ve en español y no se rompe nada.
  - Las acciones de acceso (`auth/actions.ts`, `user-actions.ts`) no pasan por `runMutation`: sus formularios traducen al mostrar, con `useMessageTranslator(authMessages)`.
- **Errores de validación de los campos:** `Input`, `Select` y `Textarea` traducen solos su `error` (catálogos `validation` y `authMessages`).
- **Textos guardados en español por el código** (historial, actividad, mensajes del sistema): se traducen al mostrarlos con `translateMessage` / `useMessageTranslator` y plantillas con `{marcadores}`. Lo que escribe una persona (notas) queda como se escribió.
- **Frases con partes en negrita o enlaces:** `rich(t("Tu casillero {code} está activo."), { code: <strong>…</strong> })`.
- **Componentes compartidos que también usan páginas de servidor:** `UiText`, `LocalDate` y `StatusLabel` (`src/components/ui/localized.tsx`) toman el idioma del contexto.
- **Estados, fechas y opciones de configuración:**
  - `getStatusLabel(status, locale)`, `formatDate` y `formatDateTime(valor, locale)`, y `flowOptionLabel(valor, locale)`. Sin `locale` siguen en español.
  - `StatusBadge` toma el idioma del contexto.
- La guía interactiva (`flow-guide.ts`) tiene su versión en inglés en `flow-guide.en.ts`. Una prueba exige que tengan los mismos pasos y estados.
- **Pruebas** (`src/lib/i18n/i18n.test.ts`):
  - cada traducción conserva sus `{marcadores}` y no queda vacía;
  - el inglés no lleva letras propias del español (á, ñ, ¿…), que suelen indicar un texto olvidado;
  - todas las preguntas frecuentes y todos los estados tienen traducción;
  - la detección del idioma.
- `tests/integration.test.ts` comprueba la cookie, la preferencia, el registro y el inicio de sesión.

## Glosario (inglés de EE. UU.)

Un mismo término se traduce siempre igual. A&L recibe en almacenes de EE. UU. (El Paso, Chicago) y entrega en México.

| Español | Inglés | Nota |
|---|---|---|
| casillero, número de casillero | locker, locker number | |
| pre-alerta / prealerta, prealertar | pre-alert, to pre-alert | |
| caja · pieza · paquete | box · piece · package | |
| recepción (el proceso o la pantalla) | receiving | «Recepción en destino» → «Destination receiving» |
| una recepción (el registro), recibo de recepción | receipt, receiving receipt | «Guardar recepción» → «Save receipt» |
| almacén, bodega | warehouse | «en bodega» → «at the warehouse»; «almacén de origen» → «origin warehouse» |
| sucursal, retiro en sucursal | pickup location, pickup at a location | |
| domicilio, entrega a domicilio | address, home delivery | |
| entrega directa (modo de origen) | direct drop-off | |
| recolección (en origen) | pickup | |
| destinatario · remitente | recipient · sender | |
| envío | shipment | |
| camión · carga · cargar | truck · load · to load | |
| manifiesto de carga | load manifest | |
| bill of lading (BOL) | bill of lading (BOL) | |
| factura · emitir · folio | invoice · to issue · number | |
| pago · cobro · cobrar | payment · charge · to charge / collect | |
| abono (pago parcial) | partial payment | |
| comprobante de pago | proof of payment | |
| pago en destino | payment at destination | |
| estado de cuenta | account statement | |
| cotizador · cotización | quote calculator · quote | |
| categoría de caja | box category | los nombres («Cubo»…) son datos y no se traducen |
| peso real · peso volumétrico · peso conjunto | actual weight · dimensional weight · combined weight | |
| precio acordado · tarifa por libra | agreed price · rate per pound | |
| recargo · excede la categoría | surcharge · exceeds the category | |
| mostrador, alta en mostrador | counter, counter sign-up | |
| operador · personal | operator · staff | |
| chofer | driver | |
| frontera | border | |
| soporte · ticket | support · ticket | |
| expediente del cliente | customer record | |
| notas internas · actividad | internal notes · activity | |
| papelera · historial de eliminación | trash · deletion history | |

Estilo:
- Mayúscula solo al inicio, como en español: «Save receipt», no «Save Receipt».
- Tuteo → inglés neutro y directo («Revisa…» → «Check…»).
- Importes como en español: `USD 12.00` o `$12.00 USD` (`formatUsd`), sin cambiar el formato.
- Los nombres de estados de México, ciudades, categorías y almacenes no se traducen.

## Estado por fases

| Fase | Alcance | Estado |
|---|---|---|
| 1 | Base, selector, sitio público (portada, cómo funciona, rastreo, preguntas), acceso (login, registro, recuperar, restablecer, verificar), errores 404/500, componentes base y etiquetas de estado | **Hecha el 2026-11-20; en producción desde el 2026-11-22** |
| 2 | Panel del cliente (`/cliente/*`), pagos con Clover y avisos push del dispositivo | **Hecha el 2026-11-20; en producción desde el 2026-11-22** |
| 3 | Admin y almacén, con su selector de idioma. Sin el formateo previo con Prettier: no hizo falta | **Hecha el 2026-11-20; en producción desde el 2026-11-22** |
| 4 | Correos (asunto, cuerpo y marco), push y avisos del panel en el idioma del destinatario; factura y recibo en el del cliente; etiqueta y manifiesto bilingües; BOL en inglés | **Hecha el 2026-11-20; en producción desde el 2026-11-22** |
| 5 (opcional) | `/en` y `hreflang` para Google, solo si se activa `SEO_INDEXABLE` | Pendiente |

El idioma del cliente lo cambia él con el selector (se guarda en su perfil) o el admin con «Idioma de correos y facturas» en la ficha del cliente, en el alta desde Clientes y en el alta en mostrador (por defecto, español).

Lo que sigue en español aunque se elija inglés:
- lo que escribe una persona: notas, motivos de rechazo o corrección, mensajes de soporte, el mensaje de llegada de cada almacén;
- los datos: nombres de categorías del catálogo («Cubo»), almacenes, ciudades, estados de México y direcciones (con «C.P.»);
- los avisos y el historial guardados antes de este cambio que no tienen plantilla (en producción los avisos se borraron el 2026-11-20);
- la palabra de confirmación que exige el servidor (RETIRAR, ELIMINAR), con la indicación en inglés;
- el nombre de la PWA (`manifest.ts`) y la página interna `/design`;
- los mensajes de error HTTP de las rutas de archivos («No autorizado»), que no ve un usuario normal.

## Preguntas para el cliente

Respondidas por el dueño el 2026-11-20:
1. El admin y el almacén se usarán en inglés: traducidos completos.
2. El inglés lo revisamos nosotros, según la lógica del negocio. Está el glosario de arriba; si alguien del lado de EE. UU. lo lee, mejor.
3. Las facturas van en el idioma del cliente.

Siguen abiertas:
4. El historial que genera el sistema se traduce al mostrarlo; lo que escribe el equipo queda como se escribió. ¿Les sirve así?
5. En el alta en mostrador el idioma es español por defecto y el operador puede elegir inglés. ¿Bien así?
6. ¿Se activará la indexación en Google? (decide la fase 5).
7. Etiqueta y manifiesto quedaron bilingües. ¿Les basta, o prefieren un idioma por almacén?

El contenido de marketing traduce lo que hoy dice el sitio, incluidas las referencias a Miami y a Nuevo Laredo en el mapa. Corregir ese contenido es un tema aparte (ver «Rastreo público» en progreso.md).
