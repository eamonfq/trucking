# Limpieza de pruebas y contacto opcional

## Acceso administrativo

`/admin/eliminar` está disponible únicamente para un administrador completo. Los permisos por sección no permiten ejecutar sus acciones de servidor.

La lista permite buscar y paginar órdenes/recepciones y usuarios. Cada eliminación requiere vista previa actualizada, motivo, confirmación de datos de prueba y escribir `ELIMINAR`. No hay borrado masivo automático.

Una recepción elimina sus unidades y los envíos/facturas relacionados (incluyendo otras cajas del mismo envío). La vista previa muestra el alcance. Se desvinculan del camión, sin eliminarlo. Para borrar un usuario deben eliminarse primero sus operaciones. No se permite borrar la cuenta propia ni el último administrador completo activo. Los registros relacionados con Clover están bloqueados, incluso si el intento no terminó: no se hacen reembolsos.

La eliminación es operativa: queda un respaldo de auditoría protegido en `deletionHistory` y un evento en `security_audit`. No hay restauración automática desde la interfaz. Los archivos quedan inaccesibles a través de la aplicación, aunque se conservan en almacenamiento hasta su política de retención. Se cancelan correos pendientes identificables; no se pueden retirar correos ya entregados o en envío. Los folios emitidos no se reutilizan. La fila SQL de la cuenta eliminada se conserva inactiva como referencia técnica, sin email/casillero ni sesiones.

No se elimina ningún dato existente al desplegar ni al ejecutar las migraciones.

## Clientes sin correo o dirección

El alta administrativa y la recepción requieren nombre, apellido y teléfono. Correo, calle, números, colonia, CP, ciudad, estado y referencias son opcionales. Si se proporciona correo o CP se valida su formato. El email ausente se guarda como NULL en accounts para permitir múltiples clientes sin correo, y como cadena vacía en el perfil. No se crean direcciones vacías durante el alta.

Los destinatarios pueden guardarse y seleccionarse sin dirección. Se conserva su nombre y teléfono en la recepción. Para entrega a domicilio, la dirección debe completarse antes de solicitar el envío.

Sin correo no se genera invitación ni se encola email. Las operaciones y avisos internos siguen funcionando. Agregar el primer correo desde el perfil envía una invitación y exige verificar el acceso. El registro público continúa requiriendo email para una cuenta de portal segura; no se inventan correos ni contraseñas compartidas.

## Despliegue

Tras actualizar el código, ejecutar `npm run db:migrate` antes de levantar la nueva versión. La migración 007 permite NULL en accounts.email y mantiene su índice único para correos reales. Después ejecutar `npm run build` y reiniciar el proceso PM2 habitual. Hacer respaldo normal de producción antes del despliegue. Nunca apuntar las pruebas de integración a una base existente: la suite crea y elimina exclusivamente una base temporal `ayl_test_<uuid>`.
