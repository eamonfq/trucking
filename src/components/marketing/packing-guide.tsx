const GOOD = ["Caja firme y bien empacada", "Sellada en todas sus uniones", "Conserva su forma cuadrada"];
const BAD = ["Dañada, rota o abierta", "Cartón húmedo o debilitado", "Deformada o sin forma cuadrada"];

export function PackingGuide() {
  return (
    <div className="grid gap-5 sm:grid-cols-2">
      <article className="flex flex-col gap-6 rounded-xl border border-line-300 bg-cream-50 p-7">
        <p className="flex items-center gap-2.5 text-sm font-semibold text-success">
          <span aria-hidden="true" className="grid size-6 place-items-center rounded-full bg-success text-xs text-white">✓</span>
          Así debe viajar
        </p>
        <svg viewBox="0 0 300 140" fill="none" role="img" aria-label="Caja correcta: firme, sellada y con forma cuadrada" className="h-35 w-full">
          <polygon points="150,20 240,52 150,84 60,52" fill="#FFFFFF" stroke="#1C2B4B" strokeWidth="2.5" strokeLinejoin="round" />
          <polygon points="240,52 240,104 150,136 150,84" fill="#C24E12" stroke="#1C2B4B" strokeWidth="2.5" strokeLinejoin="round" />
          <polygon points="60,52 150,84 150,136 60,104" fill="#E8621C" stroke="#1C2B4B" strokeWidth="2.5" strokeLinejoin="round" />
          <path d="M105 36 L195 68" stroke="#1C2B4B" strokeWidth="2.5" strokeDasharray="7 6" />
          <path d="M150 84 L150 136" stroke="#1C2B4B" strokeWidth="2.5" opacity=".5" />
        </svg>
        <ul className="grid gap-2 text-sm leading-6 text-ink-700">{GOOD.map((item) => <li key={item}>{item}</li>)}</ul>
      </article>

      <article className="flex flex-col gap-6 rounded-xl border border-line-300 bg-cream-50 p-7">
        <p className="flex items-center gap-2.5 text-sm font-semibold text-danger">
          <span aria-hidden="true" className="grid size-6 place-items-center rounded-full bg-danger text-xs text-white">✕</span>
          No puede viajar
        </p>
        <svg viewBox="0 0 300 140" fill="none" role="img" aria-label="Caja deformada y rota: no apta para viajar" className="h-35 w-full">
          <polygon points="150,26 236,56 156,86 64,54" fill="#FFFFFF" stroke="#B3261E" strokeWidth="2.5" strokeLinejoin="round" />
          <polygon points="236,56 232,100 156,132 156,86" fill="#EFE7DA" stroke="#B3261E" strokeWidth="2.5" strokeLinejoin="round" />
          <polygon points="64,54 156,86 156,132 72,108" fill="#E3D9CA" stroke="#B3261E" strokeWidth="2.5" strokeLinejoin="round" />
          <path d="M96 74 L120 96 L96 112" stroke="#B3261E" strokeWidth="2.5" fill="none" />
          <path d="M196 76 L214 92" stroke="#B3261E" strokeWidth="2.5" />
        </svg>
        <ul className="grid gap-2 text-sm leading-6 text-ink-700">{BAD.map((item) => <li key={item}>{item}</li>)}</ul>
      </article>
    </div>
  );
}
