export type ProcessStep = { title: string; body: string };

export function ProcessSteps({ steps, lockerCode }: { steps: ProcessStep[]; lockerCode: string }) {
  return (
    <div className="relative flex flex-col gap-12 lg:gap-0">
      <div aria-hidden="true" className="absolute inset-y-16 left-6 w-0.5 bg-[repeating-linear-gradient(180deg,#C9BFAD_0_8px,transparent_8px_18px)] lg:left-1/2 lg:-translate-x-1/2" />
      {steps.map((step, index) => {
        const alignRight = index % 2 === 1;
        return (
          <div key={step.title} className="relative grid gap-6 pl-16 lg:grid-cols-[1fr_auto_1fr] lg:items-center lg:gap-12 lg:py-10 lg:pl-0">
            <div className={alignRight ? "hidden lg:block" : "lg:text-right"}>
              {alignRight ? (index === 1 ? <LabelledBox lockerCode={lockerCode} /> : null) : <StepCopy step={step} index={index} />}
            </div>
            <span className="absolute left-0 top-0 grid size-12 place-items-center rounded-full border-2 border-brand-600 bg-cream-100 font-display text-base font-bold text-brand-700 lg:static lg:size-14 lg:text-lg">
              {String(index + 1).padStart(2, "0")}
            </span>
            <div className={alignRight ? "" : "hidden lg:block"}>
              {alignRight ? <StepCopy step={step} index={index} /> : null}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function StepCopy({ step, index }: { step: ProcessStep; index: number }) {
  return (
    <div className="flex flex-col gap-3">
      <p className="text-over font-semibold uppercase text-label-600">Paso {String(index + 1).padStart(2, "0")}</p>
      <h3 className="font-display text-h2 font-semibold text-navy-900">{step.title}</h3>
      <p className="max-w-md text-sm leading-6 text-ink-700 lg:max-w-sm">{step.body}</p>
    </div>
  );
}

function LabelledBox({ lockerCode }: { lockerCode: string }) {
  return (
    <svg viewBox="0 0 300 300" fill="none" role="img" aria-label="Caja con etiqueta de envío y número de casillero" className="mx-auto w-full max-w-70">
      <ellipse cx="150" cy="258" rx="96" ry="15" fill="#1C2B4B" opacity=".12" />
      <path d="M150 30 L250 90 L150 150 L50 90 Z" fill="url(#box-iso-top)" />
      <path d="M50 90 L150 150 L150 250 L50 190 Z" fill="url(#box-iso-lit)" />
      <path d="M250 90 L250 190 L150 250 L150 150 Z" fill="url(#box-iso-dark)" />
      <path d="M150 30 L150 150" stroke="rgba(74,48,14,.28)" strokeWidth="1.4" />
      <polygon points="92,81 208,81 208,99 92,99" fill="#D9C8A6" opacity=".9" />
      <polygon points="92,84 208,84 208,88 92,88" fill="rgba(255,255,255,.45)" />
      <path d="M50 90 L150 30 L250 90" stroke="rgba(255,255,255,.5)" strokeWidth="1.6" fill="none" />
      <path d="M150 150 L150 250 M50 90 L150 150 M250 90 L150 150" stroke="rgba(74,48,14,.35)" strokeWidth="1.2" />
      <path d="M168 198 L234 159 L234 110 L168 149 Z" fill="#FDFBF7" />
      <g transform="translate(176 176) matrix(0.866 -0.5 0 1 0 0)">
        <text x="0" y="0" fontFamily="var(--font-bricolage), sans-serif" fontWeight="800" fontSize="15" letterSpacing="-0.4" fill="#1C2B4B">A&amp;L</text>
        <text x="0" y="14" fontFamily="Inter, system-ui, sans-serif" fontWeight="700" fontSize="9.5" letterSpacing="0.3" fill="#A8410C">{lockerCode}</text>
        <rect x="0" y="21" width="46" height="3" rx="1.5" fill="#DED5C6" />
        <rect x="0" y="28" width="34" height="3" rx="1.5" fill="#DED5C6" />
        <rect x="0" y="-14" width="8" height="8" rx="1" fill="#C24E12" />
      </g>
    </svg>
  );
}
