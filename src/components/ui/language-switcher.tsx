"use client";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { setLocale } from "@/lib/i18n/actions";
import { LOCALES, LOCALE_NAMES, type Locale } from "@/lib/i18n/config";
import { useLocale } from "@/lib/i18n/provider";

const LABEL: Record<Locale, string> = { es: "ES", en: "EN" };
const GROUP_LABEL: Record<Locale, string> = { es: "Idioma", en: "Language" };

/** Selector ES | EN. Guarda la elección (cookie y, con sesión, el perfil) y vuelve a pintar la página. */
export function LanguageSwitcher({ tone = "light", className = "" }: { tone?: "light" | "dark"; className?: string }) {
  const current = useLocale();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const choose = (locale: Locale) => {
    if (locale === current || pending) return;
    startTransition(async () => {
      const result = await setLocale(locale);
      if (result.ok) router.refresh();
    });
  };
  const idle = tone === "dark" ? "text-white/60 hover:text-white" : "text-ink-500 hover:text-navy-900";
  const active = tone === "dark" ? "bg-white/15 text-white" : "bg-navy-900 text-white";
  return (
    <div role="group" aria-label={GROUP_LABEL[current]} aria-busy={pending} className={`inline-flex items-center gap-0.5 rounded-lg p-0.5 text-xs font-semibold ${tone === "dark" ? "border border-white/15" : "border border-line-300"} ${className}`}>
      {LOCALES.map((locale) => (
        <button key={locale} type="button" lang={locale} aria-pressed={locale === current} title={LOCALE_NAMES[locale]} disabled={pending} onClick={() => choose(locale)} className={`rounded-md px-2 py-1 transition disabled:opacity-60 ${locale === current ? active : idle}`}>
          {LABEL[locale]}
        </button>
      ))}
    </div>
  );
}
