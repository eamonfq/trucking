# Sistema de diseño A&L Trucking Logistics

Sistema derivado del rediseño editorial de la superficie pública. La fuente de verdad son los tokens de `src/app/globals.css`; este documento explica cómo usarlos.

## Dirección visual

Editorial y operativo a la vez: superficies amplias, tipografía display de peso alto como elemento protagonista y naranja racionado a una aparición por sección. El precio es un elemento tipográfico dominante, no una etiqueta más. Las cajas se dibujan isométricas y a escala real entre sí.

## Color

| Token | Valor | Uso |
|---|---|---|
| `brand-500` | `#E8621C` | Solo ilustración y display de 24 px o más. |
| `brand-600` | `#C24E12` | Botones y superficies con texto blanco. |
| `brand-700` | `#A8410C` | Texto naranja de 18 px o menos y badges chicos. |
| `brand-300` | `#F2914E` | Acentos sobre fondos oscuros. |
| `navy-900` · `navy-800` · `navy-700` | `#1C2B4B` · `#22335A` · `#33436B` | Texto principal, superficies oscuras y bordes sobre oscuro. |
| `navy-950` · `navy-975` | `#101A2F` · `#0B1426` | Hero y franja de rastreo. |
| `ink-700` · `ink-500` · `label-600` | `#414960` · `#5C6379` · `#756950` | Cuerpo, texto secundario y etiquetas. |
| `cream-50` · `cream-100` | `#FBF9F5` · `#F6F1E9` | Fondos cálidos alternos. |
| `line-200` · `line-300` | `#EDE6DA` · `#DED5C6` | Divisores y bordes de campo. |
| `success` · `warning` · `danger` | `#1E7A4B` · `#8A5A00` · `#B3261E` | Únicamente estados. |

**La regla del naranja no es opcional**: `brand-500` no alcanza contraste AA como texto pequeño sobre blanco. Para texto usa `brand-700`; para un botón relleno, `brand-600` con texto blanco.

Los paneles de cliente y operación todavía usan la nomenclatura anterior (`orange-*`, `stone-*`, `navy-950`). Esos nombres viven como alias al final del bloque `@theme` y apuntan a los valores nuevos, así que heredan la paleta sin reescribirse. Al escribir código nuevo usa siempre los nombres canónicos.

## Tipografía

Bricolage Grotesque para display y cifras; Inter para interfaz y cuerpo. Ambas se autoalojan con `next/font/local`.

| Token | Tamaño / interlínea | Uso |
|---|---|---|
| `text-d1` · `text-d2` · `text-d3` | 104 / 76 / 56 px | Hero y titulares de sección. |
| `text-h1` · `text-h2` | 36 / 23 px | Títulos de bloque y de tarjeta. |
| `text-lg` · `text-base` · `text-sm` · `text-xs` | 21 / 17 / 15 / 13 px | Bajadas, cuerpo, secundario y etiquetas de campo. |
| `text-over` | 12 px, `+0.14em`, versalitas | Overline de sección. |

## Forma, profundidad y ritmo

Radios: `sm` 8, `md` 10, `lg` 14, `xl` 20 px. Los controles usan `md`, las tarjetas `lg` o `xl`. Sombras: `card` para reposo, `pop` para elementos flotantes y `frame` para lienzos completos. Los controles miden 48 px de alto (56 en formularios de auth y cotizador). Las transiciones duran 180–240 ms y se desactivan con `prefers-reduced-motion`.

## Componentes

Los componentes base viven en `src/components/ui` y siguen el kit del rediseño: botón primario relleno, secundario con borde marino, terciario con borde crema y destructivo con borde rojo. `StatusBadge` lee un mapa único de estado en `src/lib/config/status.ts`, compartido por cliente, operación y rastreo público: los estados en movimiento y los terminales van en sólido, el resto en tinte con borde del mismo tono.

## Ilustración

`<BoxIso>` calcula la proyección isométrica desde las dimensiones del tarifario, así la ilustración nunca se desincroniza del precio. Con el mismo `scale` en varias cajas quedan a escala real entre sí. Los degradados se declaran una vez por página con `<BoxIsoDefs />`. Mapas y guías de empaque son SVG propios en `src/components/marketing`. No se usan fotografías, emojis ni gradientes decorativos.

## Datos pendientes

La clase `.pending-data` aplica una trama diagonal a cualquier valor que todavía no confirma el cliente (tiempos de tránsito, dirección de bodega, teléfono). Sirve para que en la reunión se distinga a simple vista lo real de lo pendiente.

## Responsive

La base es móvil. El hero muestra tres cajas en línea y pasa a la composición de cinco desde `lg`. Las tablas densas se desplazan en horizontal. Los objetivos de interacción mantienen 44 × 44 px como mínimo.

## Accesibilidad y contenido

Los campos llevan `label` visible, los errores se asocian con `aria-describedby`, los iconos decorativos se ocultan de lectores y todo control opera por teclado. El foco es un contorno `brand-600` de 3 px con separación. La interfaz usa español de México y evita terminología de cobro por libra o volumen: el peso existe solo como límite de una categoría.
