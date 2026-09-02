import { cn } from "@/lib/utils/cn";

export function BoxMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 240 210" role="img" aria-label="Ilustración isométrica de una caja A&L" className={cn("h-auto w-full", className)}>
      <path d="M27 72 119 22l94 49-94 52L27 72Z" fill="#fff" stroke="#1C2B4B" strokeWidth="4" strokeLinejoin="round" />
      <path d="m27 72 92 51v67L27 137V72Z" fill="#F6F1E9" stroke="#1C2B4B" strokeWidth="4" strokeLinejoin="round" />
      <path d="m119 123 94-52v67l-94 52v-67Z" fill="#E8621C" stroke="#1C2B4B" strokeWidth="4" strokeLinejoin="round" />
      <path d="m79 44 94 49v29" fill="none" stroke="#1C2B4B" strokeWidth="4" strokeLinejoin="round" />
      <path d="m120 22 93 49-40 22-94-49 41-22Z" fill="#FFE8D8" stroke="#1C2B4B" strokeWidth="4" strokeLinejoin="round" />
      <path d="M50 104h43v29H50z" fill="#fff" stroke="#1C2B4B" strokeWidth="3" />
      <path d="M59 116h25M59 124h17" stroke="#E8621C" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}
