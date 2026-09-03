# Auditoría final

Fecha: 2 de septiembre de 2026.

Medición ejecutada con Lighthouse 13.4.0 contra `next start` y la compilación de producción local. Perfil desktop, categorías estándar.

| Vista | Rendimiento | Accesibilidad | Buenas prácticas | SEO | FCP | LCP | TBT | CLS |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| Landing `/` | 100 | 100 | 100 | 100 | 0.3 s | 0.7 s | 10 ms | 0 |
| Login `/login` | 100 | 100 | 100 | 100 | 0.3 s | 0.6 s | 30 ms | 0.048 |
| Panel `/cliente` | 100 | 100 | 100 | 100 | 0.3 s | 0.7 s | 0 ms | 0 |

También se revisaron visualmente los anchos 360, 768, 1280 y 1536 px; no se detectó desbordamiento horizontal. Se validaron manualmente inicio de sesión de cliente y administrador, rastreo público y navegación móvil del panel operativo.

Los resultados dependen del equipo y del entorno local; deben repetirse en la infraestructura final antes de publicar.
