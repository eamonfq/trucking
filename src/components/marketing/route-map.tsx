const NODES = [
  { x: 356, y: 250, r: 8, label: "Monterrey", tx: 376, ty: 255, anchor: "start" as const, weight: 500, size: 15, fill: "#F2914E" },
  { x: 208, y: 388, r: 8, label: "Guadalajara", tx: 196, ty: 378, anchor: "end" as const, weight: 500, size: 15, fill: "#F2914E" },
  { x: 300, y: 386, r: 8, label: "Querétaro", tx: 310, ty: 378, anchor: "start" as const, weight: 500, size: 15, fill: "#F2914E" },
  { x: 336, y: 428, r: 10, label: "Ciudad de México", tx: 352, ty: 424, anchor: "start" as const, weight: 700, size: 16, fill: "#FFFFFF" },
  { x: 384, y: 446, r: 8, label: "Puebla", tx: 398, ty: 464, anchor: "start" as const, weight: 500, size: 15, fill: "#F2914E" },
  { x: 292, y: 452, r: 8, label: "Toluca", tx: 282, ty: 470, anchor: "end" as const, weight: 500, size: 15, fill: "#F2914E" },
];

const BRANCHES = [
  { d: "M352 192 L 356 250", opacity: 1 },
  { d: "M356 250 L 300 386", opacity: 1 },
  { d: "M300 386 L 336 428", opacity: 1 },
  { d: "M300 386 L 208 388", opacity: 0.8 },
  { d: "M336 428 L 384 446", opacity: 0.8 },
  { d: "M336 428 L 292 452", opacity: 0.8 },
];

const MAIN_ROUTE = "M800 330 C 700 300, 600 210, 520 196 C 440 182, 390 190, 352 192";

/** `progress` de 0 a 1 pinta el tramo ya recorrido sobre la ruta principal. */
export function RouteMap({ progress }: { progress?: number }) {
  return (
    <svg viewBox="0 0 900 520" fill="none" role="img" aria-label="Mapa esquemático de la ruta: Miami, cruce por Nuevo Laredo y distribución al centro de México" className="h-full w-full">
      <defs>
        <pattern id="route-grid" width="30" height="30" patternUnits="userSpaceOnUse">
          <path d="M30 0 H0 V30" fill="none" stroke="#2C3D66" strokeWidth="1" />
        </pattern>
      </defs>
      <rect width="900" height="520" fill="url(#route-grid)" opacity=".5" />

      <path d={MAIN_ROUTE} stroke="#E8621C" strokeWidth="4" strokeDasharray="12 9" strokeLinecap="round" opacity={progress === undefined ? 1 : 0.35} />
      {progress !== undefined && <path d={MAIN_ROUTE} pathLength={100} stroke="#F2914E" strokeWidth="5" strokeLinecap="round" strokeDasharray={`${Math.max(0, Math.min(1, progress)) * 100} 100`} />}
      {BRANCHES.map((branch) => <path key={branch.d} d={branch.d} stroke="#F2914E" strokeWidth="3" opacity={branch.opacity} />)}

      <circle cx="800" cy="330" r="11" fill="#fff" />
      <circle cx="800" cy="330" r="22" fill="none" stroke="#fff" strokeWidth="1.5" opacity=".45" />
      <text x="800" y="374" textAnchor="middle" fontFamily="Inter, system-ui, sans-serif" fontWeight="700" fontSize="17" fill="#fff">Miami</text>
      <text x="800" y="394" textAnchor="middle" fontFamily="Inter, system-ui, sans-serif" fontWeight="400" fontSize="13" fill="#8A96B4">Bodega de origen</text>

      <rect x="336" y="176" width="32" height="32" rx="6" transform="rotate(45 352 192)" fill="#E8621C" />
      <text x="352" y="132" textAnchor="middle" fontFamily="Inter, system-ui, sans-serif" fontWeight="400" fontSize="13" fill="#F2914E">Cruce fronterizo</text>
      <text x="352" y="152" textAnchor="middle" fontFamily="Inter, system-ui, sans-serif" fontWeight="700" fontSize="16" fill="#fff">Nuevo Laredo</text>

      {NODES.map((node) => <g key={node.label}>
        <circle cx={node.x} cy={node.y} r={node.r} fill={node.fill} />
        <text x={node.tx} y={node.ty} textAnchor={node.anchor} fontFamily="Inter, system-ui, sans-serif" fontWeight={node.weight} fontSize={node.size} fill="#fff">{node.label}</text>
      </g>)}
    </svg>
  );
}
