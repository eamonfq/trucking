# A&L Trucking Logistics

Sistema operativo Next.js con autenticación y persistencia MySQL, recepción, prealertas, viajes multidestino, escaneo, operadores por almacén, facturación y pagos.

## Instalación y servidor

- [Guía de despliegue y variables de producción](docs/DESPLIEGUE-SERVIDOR.md).
- [Autenticación, MySQL y Resend](docs/AUTH-REAL.md).
- [Recepción y cálculo de cobros](docs/RECEPCION-Y-PAGOS.md).
- [Ubicaciones y reglas de pagos confirmadas](docs/ALMACENES-Y-PAGOS-CONFIRMADOS.md).
- [Flujo del sistema](docs/FLUJO-DEL-SISTEMA.md).

## Desarrollo local

Node.js 24, npm y MySQL. Configurar .env.local con .env.example como referencia, sin sobrescribir secretos existentes.

```bash
npm ci
npm run db:migrate
npm run db:admin
npm run dev
```

URL local: http://localhost:3100. Base local: ayl_real. No existen accesos demo activos. El primer administrador se genera con contraseña aleatoria en .local/admin-access.txt, excluido de Git.

## Validación

```bash
npm test
npm run test:integration
npm run build
npm run system:check
```

Integración usa una base desechable ayl_test_<uuid>, sin alterar ayl_real ni enviar correos reales. Los datos operativos y archivos privados están en MySQL, no en Git.

## Producción

Requiere Node persistente detrás de HTTPS, MySQL y un proceso separado npm run email:worker. No basta con subir archivos a un hosting PHP. No copiar node_modules de Windows a Linux.

El correo local permanece en preview. Configurar dominio y remitente verificados, rotar la clave Resend compartida y revisar la cola antes de activar envíos. Nunca versionar .env.local, .local, respaldos SQL ni claves. El push del código no despliega el servidor ni transfiere la base.
