# Recepción con destinatarios y múltiples paquetes

- Un cliente conserva varios destinatarios con nombre, teléfono y dirección propios. El alta rápida permite capturar varios contactos para la dirección inicial; luego se agregan más direcciones en la ficha del cliente.
- Recepción permite buscar, crear, editar y seleccionar destinatario. Quitar selección no borra el contacto. Eliminar del cliente se bloquea si ya tiene paquetes o envíos vinculados, para conservar el historial.
- Cada grupo recibido corresponde a un cliente, origen y destinatario. Para repartir carga entre destinatarios se registran grupos separados. El paquete conserva una copia del contacto y dirección, sin modificar retroactivamente su historia al editar el directorio.
- Se pueden recibir de 1 a 50 piezas: iguales (medidas, peso y precio por pieza) o personalizadas. El tipo de cobro es común, pero el cálculo se realiza por pieza. El precio manual siempre es unitario. La prealerta se aplica solo a la primera pieza; no se reutiliza el mismo tracking para aparentar múltiples recepciones de esa prealerta.
- El grupo se guarda en una transacción, incluyendo facturas, pagos y correos. Si falla una pieza o el importe agregado no coincide, se revierte todo. Se conserva una factura/folio por pieza según el flujo existente; la suma del importe bancario se valida antes de repartirlo entre estas facturas. La foto opcional seleccionada es común a las piezas del grupo.
- Cada pieza tiene un código único y numeración persistida 1/N…N/N. La ruta `/etiquetas/ID?grupo=1` imprime el grupo completo; sin ese parámetro imprime la pieza individual con su numeración original.
- Etiquetas: papel 100 × 150 mm, escala 100 %, sin encabezados/pies del navegador. La composición tiene altura fija de 149 mm para margen de redondeo y un salto por etiqueta. Validar con la impresora real antes de operación masiva.
- Camiones: acceso «Escanear carga» desde el listado. Guardar origen/paradas y después pulsar «Iniciar carga para escanear». Elegir destino, escanear y Enter. Se mantienen las validaciones de estado, origen, ruta y capacidad; no se reabren camiones despachados.

No requiere migración SQL adicional: los nuevos campos se almacenan en los documentos JSON existentes. Los registros históricos sin grupo o destinatario siguen funcionando; su etiqueta individual muestra 1/1.

## Panel del cliente

Mis cajas muestra pieza/total, origen y contacto receptor; el detalle incluye la dirección capturada en recepción. Los gestores de direcciones y destinatarios permiten búsqueda y paginación y están enlazados entre sí. Crear envío selecciona el destinatario asignado y bloquea combinaciones con destinatarios o direcciones históricas distintas. El servidor conserva la copia de recepción al crear la guía: editar posteriormente el directorio no cambia el contacto ni la dirección del paquete. La corrección de una recepción ya registrada requiere intervención de operaciones.
