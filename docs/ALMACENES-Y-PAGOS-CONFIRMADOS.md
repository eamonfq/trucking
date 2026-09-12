# Ubicaciones y pagos — 11 de septiembre de 2026

## Datos cargados en MySQL local

- Chicago / Arlington Heights: 75 Algonquin Dr, Arlington Heights, IL 60005. Rayza Morales.
- El Paso: 1123 Desert Dr, El Paso, TX 79912. Lizette Ponce.
- México: Las Cuatro Esquinas, 49540 Valle de Juárez, Jalisco, México.

Las cuentas creadas son operadores: recepción/descarga y consulta de contactos solo en su almacén, sin acceso a facturas ni cobros. Las invitaciones se prepararon cifradas en modo preview, no se enviaron. Faltan los correos de Pablo y Emilia Flores y confirmar el correo de Agustín Orozco, recibido con una tilde. No se inventaron correos ni contraseñas compartidas. La asignación de cobros a Emilia requiere completar y confirmar su acceso; no se le ha otorgado administración general.

La importación es idempotente y no cambia el rol de cuentas existentes. Datos de importación en .local (no versionado). Las direcciones se editan en Almacenes y operadores; el teléfono del operador es opcional.

## Pagos

- Efectivo, tarjeta, transferencia y depósito. Los tres métodos bancarios capturan el importe recibido y aceptan referencia externa opcional. Efectivo usa el total de la factura y no necesita referencia externa.
- Folio PAG-año-secuencia generado en el servidor dentro de la misma transacción que confirma el pago. La secuencia se conserva en MySQL, con serialización para evitar duplicados concurrentes.
- Pago en destino genera un acuerdo ACU, no un pago confirmado. Al cobrar genera un nuevo PAG; ambos permanecen en el historial.
- Registro conserva cliente, factura, paquetes, importe, método, fecha, operador y ubicación. El historial muestra la guía mediante el vínculo de los paquetes cuando se crea el envío; antes indica pendiente de asignar.
- Reportes del cliente tienen folio y estado en revisión: no acreditan dinero hasta aprobación. La ubicación y el operador validador se guardan al confirmar. Un rechazo conserva el folio con estado rechazado.
- Las referencias y documentos históricos no se eliminan. No se inventan folios ni ubicaciones para pagos históricos.
- Por ahora el registro/validación de cobros continúa reservado al administrador. Operadores de recepción no pueden cobrar ni consultar facturas.

## Entrega

Bloqueo en interfaz y servidor: debe existir facturación y estar pagada para todos los paquetes del mismo envío. Reportado, vencido, borrador y pendiente en destino no permiten entregar. No se exige liquidar otros envíos independientes del cliente. El bloqueo no impide recepción ni descarga.

## Verificación

Pruebas MySQL en base aislada: efectivo sin referencia, transferencia/depósito, folios distintos en operaciones concurrentes, referencia bancaria separada, ubicación inválida, montos incorrectos, persistencia, acuerdo más cobro y rechazo de cobros repetidos. El recorrido de entrega ahora verifica el bloqueo antes de liquidar.
