# Fotos de recepción y R2

## Flujo

1. Cámara o galería en tablet. Original de hasta 30 MB; nunca se envía el original.
2. Compresión local JPEG, hasta 1920 px por lado y 512 KB; reducción progresiva si hace falta. HEIC depende del soporte del navegador; si no puede decodificarlo, se indica usar JPEG.
3. Vista previa y tamaño final. Guardar se bloquea durante la compresión.
4. Al guardar, el servidor decodifica, reorienta y normaliza de nuevo la imagen, quita metadatos (incluido GPS) y valida un máximo de 2 MB. Fotos inválidas no generan recepción.
5. Con R2 habilitado se guarda la foto en `ayl/reception/<uuid>.jpg`; MySQL conserva la propiedad, referencia y hash de integridad. Los comprobantes y las fotos anteriores permanecen en MySQL.
6. La descarga sigue pasando por `/api/files/[id]`, con sesión y autorización de propietario/administrador. No se entrega una URL pública.

Si falla la transacción, se intenta eliminar exclusivamente el objeto nuevo de esa operación. No se borra después de un resultado ambiguo del commit. Una caída del proceso o una falla de red puede dejar objetos huérfanos que requieren revisión; no se eliminan indiscriminadamente.

## Configuración

Variables privadas en `.env.local` (local) o el entorno de producción:

```env
PHOTO_STORAGE=mysql
R2_ENDPOINT=https://ACCOUNT_ID.r2.cloudflarestorage.com
R2_BUCKET=courierplus
R2_ACCESS_KEY_ID=...
R2_SECRET_ACCESS_KEY=...
R2_PRIVATE_CONFIRMED=false
R2_URL=https://PUBLIC_ID.r2.dev
```

`R2_URL` solo sirve para la prueba de privacidad, no para servir fotos. Deshabilitar Public Development URL y cualquier dominio público vinculado al bucket **antes** de habilitar R2. No usar un bucket público compartido con otro sitio para fotografías privadas. La confirmación es operativa, no sustituye la configuración de Cloudflare; no reactivar acceso público después.

```bash
npm ci
npm run db:migrate
npm run r2:check
```

`r2:check` crea una imagen sintética en `ayl/connectivity-tests/`, verifica subida, lectura e integridad, comprueba la URL pública configurada y elimina solo su propio objeto. No enumera ni borra archivos existentes. Usa certificados de confianza del sistema; no desactivar TLS.

Una vez verificado el bucket privado, configurar `PHOTO_STORAGE=r2` y `R2_PRIVATE_CONFIRMED=true`, ejecutar `npm run build` y reiniciar el proceso PM2 de esta aplicación con `--update-env`. Las claves nunca deben usar prefijo `NEXT_PUBLIC_` ni subirse a Git.

Migración 005: agrega proveedor y clave de objeto a `private_files`, permite contenido nulo para archivos R2 y conserva todos los registros existentes. Aplicarla antes de arrancar esta versión.

## Retención pendiente de aprobación

No hay borrado automático habilitado. Falta confirmar si los cuatro meses se cuentan desde la subida o desde la entrega, así como la protección de incidencias. No se han añadido reglas de caducidad al bucket, ni programado tareas. No borrar comprobantes, facturas ni objetos ajenos al prefijo de la aplicación. La eventual limpieza debe conservar el historial y mostrar que una foto expiró, en lugar de dejar enlaces rotos.
