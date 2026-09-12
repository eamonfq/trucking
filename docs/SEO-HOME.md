# Portada y SEO

La portada usa el catálogo activo y los destinos de MySQL. No fija una cantidad de categorías, no inventa tiempos de entrega y distingue tarifa base de validación y ajustes. El cotizador y el rastreador existentes permanecen funcionales. El recorrido completo sigue en /como-funciona.

## Implementado

- Diseño anterior restaurado por preferencia del usuario: fondo azul oscuro, composición de cajas y secciones originales. Se conservan el logo, la navegación accesible y los datos configurables.
- Título y descripción de inicio, canonical por página pública, Open Graph y Twitter de texto.
- JSON-LD Organization, WebSite, Service y FAQPage, sin reseñas, contactos ni direcciones ficticias. Las preguntas visibles y estructuradas usan la misma fuente; se escapa HTML en la serialización.
- Sitemap limitado a inicio y guía, sin fechas de actualización inventadas.
- Noindex en autenticación, administración, cliente y todas las páginas de rastreo. Robots no sustituye los controles de acceso.
- Fuentes locales y contenido principal renderizado en servidor. El recorrido interactivo vuelve a estar integrado en el inicio y también está disponible en /como-funciona.

## Activación pública pendiente

1. Confirmar dominio HTTPS y establecer NEXT_PUBLIC_SITE_URL al origen definitivo, sin rutas.
2. Confirmar contactos, dirección de recepción, cobertura y condiciones comerciales. Publicar los textos legales aprobados; no se han inventado documentos legales ni enlaces vacíos.
3. Solo al autorizar el lanzamiento: SEO_INDEXABLE=true y reconstruir/reiniciar. Por defecto el entorno permanece noindex y el sitemap está vacío.
4. Verificar propiedad en Search Console, enviar /sitemap.xml y validar datos estructurados sobre la URL pública. No se ha realizado esta gestión externa.
5. Medir Core Web Vitals en producción y revisar la experiencia móvil con datos reales. No se declara una puntuación Lighthouse ni posicionamiento garantizado.

No se generó una imagen social nueva ni se añadieron analíticas o rastreadores externos.
