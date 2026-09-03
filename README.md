# A&L Trucking Logistics — demo operativo

Demo navegable en Next.js 16 para validar el flujo de carga terrestre USA → México con precio fijo por categoría de caja.

## Requisitos

- Node.js 20.9 o posterior (probado con Node 24)
- npm
- Laragon es opcional; el servidor de desarrollo se ejecuta con Node en el puerto 3000

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

Este demo usa fixtures tipados y mutaciones en memoria porque así lo exige el alcance de validación. La UI nunca consume fixtures directamente: pasa por servicios, por lo que una integración MySQL puede sustituir el interior de esa capa sin rediseñar pantallas. Las credenciales locales `root/root` no se incluyen en el repositorio.

## Qué falta para producción

Persistencia MySQL, almacenamiento privado de archivos, hashing de contraseñas, autorización por recurso, auditoría, datos reales del negocio, CFDI, reglas aduanales, dominio verificado de Resend, colas de trabajo, webhooks y observabilidad. Consulta [docs/DECISIONS.md](docs/DECISIONS.md).
