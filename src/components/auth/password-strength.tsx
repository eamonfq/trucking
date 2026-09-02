export function PasswordStrength({ value }: { value: string }) {
  const score = [value.length >= 8, /[A-Z]/.test(value), /[a-z]/.test(value), /\d/.test(value), /[^A-Za-z0-9]/.test(value)].filter(Boolean).length;
  const label = score < 3 ? "Débil" : score < 5 ? "Buena" : "Fuerte";
  return <div aria-live="polite"><div className="grid grid-cols-5 gap-1">{Array.from({ length: 5 }, (_, index) => <span key={index} className={`h-1 rounded-full ${index < score ? score < 3 ? "bg-danger-700" : score < 5 ? "bg-orange-500" : "bg-success-700" : "bg-stone-200"}`} />)}</div><p className="mt-2 text-xs text-navy-500">Seguridad: {label}</p></div>;
}
