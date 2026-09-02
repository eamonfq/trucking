# Sistema de diseño A&L Trucking Logistics

## Dirección visual

La interfaz combina la confianza operativa de una compañía logística con el cuidado de un producto digital premium. La composición usa superficies blancas, fondos crema, tipografía de alto contraste y bloques azul marino. El naranja A&L se reserva para una acción principal o un dato protagonista por sección.

## Color

- **Naranja A&L `#E8621C`**: acciones primarias, foco y acentos.
- **Azul marino `#1C2B4B`**: texto principal, navegación y superficies de alta jerarquía.
- **Crema `#F6F1E9`**: fondo cálido de marketing.
- **Blanco `#FFFFFF`**: tarjetas y superficies de trabajo.
- **Grises cálidos**: texto secundario, divisores y campos.
- Verde y rojo se usan exclusivamente para estados positivos y críticos.

El contraste de texto y controles se mantiene en AA. El foco es un anillo naranja exterior visible que no depende solo del color del borde.

## Tipografía

Sora es la familia display para titulares y cifras destacadas. Inter es la familia funcional para navegación, formularios, tablas y texto. La escala usa los tokens `text-xs`, `text-sm`, `text-base`, `text-lg`, `text-xl`, `text-2xl`, `text-3xl`, `text-4xl` y `text-display`; no se introducen tamaños arbitrarios en componentes.

## Forma, profundidad y ritmo

Las tarjetas usan radios entre 18 y 28 px y sombras amplias de baja opacidad. El espacio interno mínimo de una superficie es 20 px en móvil y 24 px en escritorio. Los controles tienen 44 px de alto mínimo para interacción táctil. Las transiciones duran 180–240 ms y se desactivan cuando el sistema solicita movimiento reducido.

## Componentes

Los componentes base viven en `src/components/ui`. Todos aceptan clases adicionales sin perder sus estados accesibles. `StatusBadge` obtiene color y etiqueta de un mapa único por estado. Las tablas incluyen vacío propio; los diálogos conservan foco y se cierran con Escape; los toasts anuncian cambios mediante `aria-live`.

## Ilustración

Las ilustraciones de cajas y camiones serán SVG originales, isométricos y de línea limpia. No se usan fotografías de stock, emojis ni gradientes decorativos. La profundidad proviene de geometría, capas, sombras sobrias y contraste tipográfico.

## Responsive

La base es móvil. Las tablas pueden convertirse en desplazamiento horizontal o tarjetas según densidad. El sidebar se presenta como navegación inferior o panel superpuesto en pantallas pequeñas. Los objetivos de interacción mantienen 44 × 44 px siempre que sea posible.

## Accesibilidad y contenido

Los campos llevan `label` visible, los errores se asocian con `aria-describedby`, los iconos decorativos se ocultan de lectores y todo control opera por teclado. La interfaz usa español de México y evita terminología de cobro por libra o volumen: el peso existe solo como límite de una categoría.
