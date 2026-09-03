import type { BoxCategory } from "@/lib/config/box-categories";

/*
  Proyección isométrica calculada desde las dimensiones del tarifario, para que
  la ilustración nunca se desincronice del precio. Una pulgada equivale a UNIT
  en vertical; en horizontal el eje isométrico la multiplica por raíz de tres y
  la altura del cuerpo por dos.
*/
const UNIT = 1.6;
const KX = UNIT * Math.sqrt(3);
const KH = UNIT * 2;

/** Ancho natural del viewBox de una caja. Sirve para repartir proporciones en composiciones fluidas. */
export const boxIsoWidth = (category: BoxCategory) => (category.dimensions.length + category.dimensions.width) * KX;

/** Los degradados viven una sola vez por página y las cajas los referencian por id. */
export function BoxIsoDefs() {
  return (
    <svg width="0" height="0" className="absolute" aria-hidden="true">
      <defs>
        <linearGradient id="box-iso-top" x1="0.1" y1="0" x2="0.9" y2="1">
          <stop offset="0" stopColor="#FDF9F1" />
          <stop offset="0.55" stopColor="#F1E8D7" />
          <stop offset="1" stopColor="#DCCFB6" />
        </linearGradient>
        <linearGradient id="box-iso-lit" x1="0" y1="0" x2="0.15" y2="1">
          <stop offset="0" stopColor="#F5883F" />
          <stop offset="0.45" stopColor="#E8621C" />
          <stop offset="1" stopColor="#C24E12" />
        </linearGradient>
        <linearGradient id="box-iso-dark" x1="0" y1="0" x2="0.2" y2="1">
          <stop offset="0" stopColor="#C4520F" />
          <stop offset="0.5" stopColor="#A8410C" />
          <stop offset="1" stopColor="#7E2E06" />
        </linearGradient>
      </defs>
    </svg>
  );
}

type BoxIsoProps = {
  category: BoxCategory;
  /**
   * Píxeles por unidad de viewBox. El mismo valor en varias cajas las deja a
   * escala real entre sí. Si se omite, el SVG no fija medidas y lo dimensiona
   * el contenedor: sirve para composiciones fluidas donde la escala relativa
   * se reparte con el ancho de cada envoltorio.
   */
  scale?: number;
  /** Cinta de sellado y aristas iluminadas; se usa en la composición del hero. */
  detailed?: boolean;
  className?: string;
};

export function BoxIso({ category, scale, detailed = false, className }: BoxIsoProps) {
  const { length, width, height } = category.dimensions;
  const boardWidth = (length + width) * KX;
  const topHeight = (length + width) * UNIT;
  const side = height * KH;
  const apexX = width * KX;
  const rightY = length * UNIT;
  const seamX = length * KX;
  const leftY = width * UNIT;

  const top = `${apexX},0 ${boardWidth},${rightY} ${seamX},${topHeight} 0,${leftY}`;
  const dark = `${boardWidth},${rightY} ${boardWidth},${rightY + side} ${seamX},${topHeight + side} ${seamX},${topHeight}`;
  const lit = `0,${leftY} ${seamX},${topHeight} ${seamX},${topHeight + side} 0,${leftY + side}`;

  const labelX = seamX / 2;
  const labelY = (leftY + topHeight + topHeight + side + leftY + side) / 4 + side * 0.25;
  const labelSize = Math.min(11, Math.max(7, seamX * 0.22));

  return (
    <svg
      width={scale === undefined ? undefined : boardWidth * scale}
      height={scale === undefined ? undefined : (topHeight + side) * scale}
      viewBox={`0 0 ${boardWidth} ${topHeight + side}`}
      fill="none"
      role="img"
      aria-label={`Caja ${category.name} a escala, ${length} por ${width} por ${height} pulgadas`}
      className={className}
    >
      <polygon points={top} fill="url(#box-iso-top)" stroke="rgba(74,48,14,.38)" strokeWidth="0.6" strokeLinejoin="round" />
      {detailed && <>
        <path d={`M${apexX} 0 L${seamX} ${topHeight}`} stroke="#D6C4A1" strokeWidth={boardWidth * 0.034} opacity=".85" />
        <path d={`M${apexX} 0 L${seamX} ${topHeight}`} stroke="rgba(255,255,255,.4)" strokeWidth="1" />
        <path d={`M0 ${leftY} L${apexX} 0 L${boardWidth} ${rightY}`} stroke="rgba(255,255,255,.55)" strokeWidth="0.9" fill="none" />
      </>}
      <polygon points={dark} fill="url(#box-iso-dark)" stroke="rgba(74,48,14,.38)" strokeWidth="0.6" strokeLinejoin="round" />
      <polygon points={lit} fill="url(#box-iso-lit)" stroke="rgba(74,48,14,.38)" strokeWidth="0.6" strokeLinejoin="round" />
      <text
        transform={`translate(${labelX} ${labelY}) matrix(0.866 0.5 0 1 0 0)`}
        textAnchor="middle"
        fontFamily="Inter, system-ui, sans-serif"
        fontWeight="700"
        fontSize={labelSize}
        letterSpacing="0.5"
        fill="#FFF5EA"
      >
        {category.name.toUpperCase()}
      </text>
    </svg>
  );
}
