# Almacenes de origen y destino

## Configuración y recorrido

- `/admin/almacenes`: función origen, destino o ambos; país, estado/provincia, ciudad y dirección independientes del catálogo de reparto. Crear un origen no agrega su ciudad como destino de envíos. Crear un destino sí la habilita.
- Chicago / Arlington Heights y El Paso son los orígenes iniciales. México / Valle de Juárez es el destino inicial. Las ubicaciones existentes con movimientos no se reclasifican automáticamente.
- `/admin/recepcion`: seleccionar dónde se recibe físicamente. El paquete conserva el identificador y nombre de ese origen.
- Ruta del camión: seleccionar origen y paradas de destino con sus fechas. Un origen puro no puede ser parada de descarga. No se permite cargar un paquete registrado en otro origen ni cambiar el origen de un camión cargado.
- La recepción en destino ofrece únicamente almacenes de destino o ambos y mantiene el escaneo individual y los permisos por ubicación.
- `/almacen`: consulta de paquetes/contactos del origen asignado; descarga para destinos autorizados. Nunca se exponen facturas, tarifas ni cobros a operadores. El alta inicial y la carga al camión todavía requieren administrador; no se ha creado un permiso de alta física independiente de facturación.

## Actualización

Respaldar MySQL antes de actualizar. Con este código desplegado, ejecutar `npm run db:migrate`, luego `npm run build` y reiniciar el proceso de la aplicación. La migración 004 conserva destinos históricos y clasifica los dos orígenes conocidos solo si coinciden nombre/dirección y no tienen paquetes ni rutas vinculados. No crea datos operativos en una base vacía.

Las ciudades antiguas configuradas manualmente no se eliminan automáticamente: revisar el catálogo de destinos en Configuración. Los paquetes y viajes históricos sin origen conservan sus datos; no se inventa su procedencia. Si no hay orígenes configurados, el servidor conserva compatibilidad con registros antiguos, pero los formularios nuevos piden configurar y seleccionar un origen.

En producción revisar los tres almacenes tras migrar, incluyendo país, estado y función. Las cuentas, contraseñas y datos privados locales no viajan con Git.
