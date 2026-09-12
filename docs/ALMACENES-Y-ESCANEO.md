# Almacenes, prealertas y escaneo

## Configuración inicial

Base local: ayl_real, MySQL 5.7. La migración 003 amplía el rol de cuentas; almacenes, paradas y permisos se guardan de forma transaccional en las entidades persistentes existentes. No se crean almacenes ni operadores ficticios.

1. Habilitar las ciudades en /admin/configuracion.
2. Crear almacenes en /admin/almacenes. Cada uno tiene nombre, ciudad, estado y mensaje de llegada.
3. Crear operadores en la misma sección. Asignar por almacén recibir/descargar y consultar contactos. Se prepara una invitación para definir su contraseña.
4. Crear un viaje en /admin/camiones. Abrir el detalle, agregar sus paradas y fechas y guardar la ruta antes de cargar.

## Permisos

El operador ingresa a /almacen. Puede recibir únicamente en los almacenes activos autorizados. Puede consultar código, tracking, dimensiones, peso y estado del paquete; nombre, correo, teléfono y casillero del cliente solo cuando tiene permiso de contactos en ese almacén.

No se entregan importes, facturas, comprobantes de pago ni valores declarados al módulo de operadores. El servidor protege cada consulta y descarga. El operador no registra entregas ni cobros. Cambiar sus permisos o desactivar su cuenta revoca sus sesiones.

## Recorrido físico

Prealerta del cliente o del administrador → selección en recepción → medición y recepción → etiqueta → envío confirmado → ruta con varias paradas → escaneo de carga → despacho → escaneo de descarga por almacén → entrega administrativa.

La prealerta se edita y reasigna mientras no haya sido recibida. Seleccionarla avisa al cliente una vez, sin afirmar todavía que fue recibida físicamente.

Cada parada tiene una fecha de llegada estimada, no una promesa de llegada real. Las fechas deben respetar el orden de ruta y ser posteriores o iguales a la salida. No se quita una parada con paquetes asignados; primero deben retirarse, antes del despacho.

Los viajes nuevos requieren paradas y carga por código. Los registros históricos sin el campo de paradas mantienen su compatibilidad; se convierten desde el editor de ruta antes de cargar por escaneo. Los accesos antiguos de carga manual se retiraron de la interfaz.

Un envío debe viajar completo, en un solo camión y descargarse en un mismo almacén compatible con su ciudad. Un viaje admite diferentes envíos y ciudades. Cada descarga afecta únicamente al paquete escaneado; no adelanta otras paradas. La descarga repetida es rechazada sin duplicar el correo.

## Etiquetas y lectores

Etiqueta de 100 × 150 mm en /etiquetas/ID, accesible para administrador desde recepción y detalle del paquete. Incluye logo oficial, código, barcode CODE128, casillero, medidas y peso, sin datos de cobro.

Imprimir al 100 %, sin encabezados ni pies del navegador. La impresión requiere confirmar el diálogo del equipo. Lectores USB/Bluetooth en modo teclado con Enter; también se admite ingresar el código manualmente como recuperación. El sistema verifica el código, no puede distinguir físicamente teclado de lector.

Generación basada en [JsBarcode](https://github.com/lindell/JsBarcode). Pendiente validar la lectura y tamaño con el lector y la impresora reales del almacén.

## Correos y validación

Variables del mensaje: {codigo}, {almacen}, {destino}. Se conserva el evento personalizado en el historial del paquete.

En esta instalación EMAIL_DELIVERY continúa en preview: los mensajes se preparan en cola, no se entregan externamente. Activar Resend requiere configurar el remitente verificado y el procesamiento de cola; no liberar correos de pruebas.

Pruebas automatizadas sobre base temporal aislada: permisos cruzados, datos financieros ausentes, revocación de sesiones, teléfono internacional, prealerta/selección sin duplicados, paradas, escaneos repetidos y llegada parcial. No sustituyen la prueba de impresora/lector ni la entrega real de correos.
