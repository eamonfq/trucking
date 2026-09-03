# A&L Trucking Logistics — demo operativo

Demo navegable en Next.js 16 para validar el flujo de carga terrestre USA → México con precio fijo por categoría de caja.

## Requisitos

- Node.js 20.9 o posterior (probado con Node 24). Next 16 rechaza versiones anteriores
- npm
- Laragon es opcional; el servidor de desarrollo se ejecuta con Node en el puerto 3000

Si trabajas desde WSL sobre una carpeta de Windows, instala las dependencias dentro del mismo entorno donde vas a compilar: `lightningcss` y `rollup` traen binarios nativos por plataforma y una instalación hecha en Windows no sirve para Linux.

## Ejecutar

```bash
npm install
copy .env.example .env.local
npm run dev
```

Abre `http://localhost:3000`. Comandos de calidad:

```bash
npm run test
npm run lint
npm run build
```

## Usuarios demo

| Rol | Usuario | Contraseña |
|---|---|---|
| Cliente | `mariana@demo.test` o `AL-MX-0001` | `Demo1234!` |
| Administrador | `admin@demo.test` | `Admin1234!` |

## Qué puede hacer el cliente

Con la sesión de cliente, cada acción del panel persiste en el store mock y el administrador la ve en la misma sesión:

- Registrar pre-alertas, que crean la caja en estado `pre-alertada`.
- Crear envíos con las cajas elegibles de bodega, un destinatario y la forma de entrega habilitada por `deliveryMode`.
- Reportar el pago de una factura con referencia y comprobante, y ver la resolución de Operaciones.
- Administrar direcciones y destinatarios con validación mexicana, autocompletado por código postal y confirmación al eliminar.
- Editar sus datos de contacto, cambiar la contraseña confirmando la actual y abrir tickets de soporte con hilo.

Las páginas de detalle de caja, envío y factura, igual que las rutas PDF, responden 404 si el recurso no pertenece a la cuenta autenticada.

## Correo con Resend

Define `RESEND_API_KEY` y `RESEND_FROM_EMAIL` en `.env.local`. El remitente debe pertenecer a un dominio verificado en Resend para producción. Los correos dirigidos a dominios `.test` se simulan deliberadamente; usa una dirección real autorizada para una prueba efectiva. Nunca subas `.env.local` a Git.

Los eventos preparados para email incluyen bienvenida, recuperación de contraseña, pre-alerta, confirmación de envío, reporte/aprobación de pago, soporte, cambio de contraseña y avance de camión.

## Configuración del flujo

Abre `/admin/configuracion` con el usuario administrador. Los cinco flags se editan en vivo:

- `originMode`: casillero o entrega directa.
- `packingMode`: cliente o agencia.
- `billingMoment`: al recibir o al despachar.
- `excessPolicy`: subir categoría, recargo o rechazo.
- `deliveryMode`: sucursal, domicilio o ambas.

La configuración y el tarifario viven en `src/lib/config`; sus servicios están en `src/lib/services/config.ts`.

## Datos y MySQL

Este demo usa fixtures tipados y mutaciones en memoria porque así lo exige el alcance de validación. Reiniciar el servidor restaura los fixtures, lo que permite repetir la demostración desde cero. La UI nunca consume fixtures directamente: pasa por servicios, por lo que una integración MySQL puede sustituir el interior de esa capa sin rediseñar pantallas. Las credenciales locales `root/root` no se incluyen en el repositorio.

## Qué falta para producción

Persistencia MySQL, almacenamiento privado de archivos, hashing de contraseñas, autorización por recurso, auditoría, datos reales del negocio, CFDI, reglas aduanales, dominio verificado de Resend, colas de trabajo, webhooks y observabilidad. Consulta [docs/DECISIONS.md](docs/DECISIONS.md) y el estado de remediación en [docs/AUDIT.md](docs/AUDIT.md).
