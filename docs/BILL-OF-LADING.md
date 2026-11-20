# Bill of Lading y manifiesto de carga

Desde el 2026-11-08 hay dos documentos distintos por camión (decisión en [decisiones.md](decisiones.md)).

## Bill of Lading (editable)

Admin › Camiones › **Bill of Lading** (`/admin/camiones/bill-of-lading`). Requiere el permiso de la sección Camiones.

- **Formato:** el *Bill of Lading – Short Form – Not Negotiable* (VICS) que el cliente ya usaba en papel (muestra del 2026-09-12). En papel carta e inglés, sin logo. Si la carga no cabe en una página, las filas pasan a la siguiente y el encabezado se repite.
- **Crear:**
  - **Desde un camión** (en la lista o con el botón «Crear Bill of Lading» del detalle del camión). Prellena la fecha de salida, *ship from* (dirección del almacén de origen), *ship to* (última parada), las instrucciones especiales (notas del camión), una fila de *customer order* con el código del camión y los totales, y la carga agrupada (ver abajo).
  - **En blanco.**
  - En ambos casos se repiten del último BOL el *carrier name*, el SCAC, el *third party bill to*, las condiciones del flete, los nombres de las firmas, *trailer loaded* y *freight counted*. El *carrier name* por defecto es «A&L TRUCKING LOGISTICS».
- **Carga por cantidad, no por pieza:**
  - Todas las piezas comunes van en **una fila** (`BOXES`), con la cantidad y el peso total redondeado a la libra. La descripción por defecto es «Household goods and personal effects».
  - Las piezas cuya nota lleva un **VIN** son vehículos: van en su propia fila (`VEHICLE`), agrupadas por recepción y nota, con la nota como descripción.
  - Si alguna pieza no tiene peso registrado, la descripción lo indica en vez de inventar un peso.
  - Es un punto de partida: la heurística del VIN puede fallar (p. ej. una recepción de 6 piezas cuya nota menciona un vehículo). Por eso todo es editable.
- **Editar:** todos los campos de la muestra, incluidas las *Special Instructions*. Se pueden agregar y quitar filas de *customer order* (máximo 20) y de carga (máximo 60), con *handling unit*, *package*, peso, HM, descripción, NMFC y clase. «Recalcular desde TR-…» reemplaza las filas de carga con la carga actual del camión (pide confirmación) y actualiza la fila de pedido si es la del camión.
- **PDF:** `/api/bill-of-lading/[id]`. Usa solo lo guardado; «Guardar y descargar PDF» guarda antes. Los totales (*Grand Total*) se calculan con las filas. Las firmas son los nombres escritos, no firmas manuscritas.
- **Numeración:** `BOL-26####`, con la misma secuencia protegida que los demás documentos (`documentSequences`, tipo `billOfLading`): un número eliminado no se reutiliza. El campo *Bill of Lading Number* se prellena con ese código y se puede cambiar por el número del cliente.
- **Datos:** colección `billsOfLading` en `entities` (no necesita migración). Es una copia: si después cambia el camión, el BOL no cambia hasta que se recalcula o se edita.
- **Eliminar:** desde el editor, con confirmación. No afecta a camiones, cajas ni facturas.

Código: `src/lib/schemas/bill-of-lading.ts` (campos y límites), `src/lib/utils/bill-of-lading.ts` (agrupación y prellenado), `src/lib/auth/bill-of-lading-actions.ts`, `src/lib/pdf/bill-of-lading-document.tsx`, `src/components/admin/bill-of-lading-{list,editor}.tsx`.

Pruebas: `src/lib/utils/bill-of-lading.test.ts`, `src/lib/pdf/bill-of-lading-document.test.tsx` y el caso «creates an editable bill of lading…» de `tests/integration.test.ts`. Para ver el PDF de muestra: `BOL_QA=<carpeta> npx vitest run src/lib/pdf/bill-of-lading-document.test.tsx` lo escribe en esa carpeta.

## Manifiesto de carga (por pieza)

Admin › Camiones › detalle › **Manifiesto PDF** (`/api/camiones/[id]/manifiesto`, archivo `manifiesto-TR-….pdf`). Antes se llamaba «Bill of Lading PDF».

Se genera al descargarlo con la carga y las ubicaciones actuales. Lleva una fila por pieza física con cliente, destinatario, parada, peso, medidas y volumen, más los totales y las paradas con su ETA. Sirve para verificar la carga; no es el documento para el transportista. Los viajes planificados o en carga llevan BORRADOR. El peso dimensional de facturación no representa el peso físico del camión.

QA sin base de datos: `node scripts/preview-bill-of-lading.mjs` genera un manifiesto ficticio de 24 piezas en `output/pdf/bill-of-lading-muestra.pdf` (el nombre del script y del archivo es anterior al cambio).
