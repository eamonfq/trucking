import Link from "next/link";
import { BrandLogo } from "@/components/marketing/brand-logo";


const service = [
  { label: "Tarifas", href: "/#tarifas" },
  { label: "Cómo funciona", href: "/como-funciona" },
  { label: "Cobertura", href: "/#cobertura" },
  { label: "Rastrear envío", href: "/rastrear" },
];

const account = [
  { label: "Iniciar sesión", href: "/login" },
  { label: "Crear cuenta", href: "/registro" },
  { label: "Recuperar contraseña", href: "/recuperar" },
  { label: "Preguntas frecuentes", href: "/#faq" },
];

export function MarketingFooter() {
  return (
    <footer className="bg-navy-900 text-white">
      <div className="mx-auto grid max-w-[90rem] gap-12 px-5 pb-10 pt-20 sm:px-8 lg:grid-cols-[1.4fr_repeat(3,1fr)] lg:px-18">
        <div className="flex flex-col gap-5">
          <BrandLogo inverse className="h-7 w-auto" />
          <p className="max-w-xs text-sm leading-6 text-[#A8B2CA]">Carga terrestre de Miami a México con precio fijo por categoría de caja.</p>
        </div>
        <FooterColumn title="Servicio">{service.map((item) => <Link key={item.href} href={item.href} className="text-sm text-[#A8B2CA] transition hover:text-white">{item.label}</Link>)}</FooterColumn>
        <FooterColumn title="Cuenta">{account.map((item) => <Link key={item.href} href={item.href} className="text-sm text-[#A8B2CA] transition hover:text-white">{item.label}</Link>)}</FooterColumn>
        <FooterColumn title="Te acompañamos">
          <Link href="/cliente/soporte" className="text-sm text-[#A8B2CA] transition hover:text-white">Centro de soporte</Link>
          <p className="text-sm leading-6 text-[#A8B2CA]">Consulta direcciones de recepción y condiciones de entrega con nuestro equipo antes de enviar.</p>
        </FooterColumn>
      </div>
      <div className="border-t border-white/10">
        <div className="mx-auto flex max-w-[90rem] flex-col gap-2 px-5 py-6 text-xs text-[#8A96B4] sm:flex-row sm:justify-between sm:px-8 lg:px-18">
          <span>© 2026 A&amp;L Trucking Logistics</span>
          <span>Miami, USA → México</span>
        </div>
      </div>
    </footer>
  );
}

function FooterColumn({ title, children }: { title: string; children: React.ReactNode }) {
  return <div className="flex flex-col gap-4"><p className="text-over font-semibold uppercase text-brand-300">{title}</p><div className="flex flex-col gap-3">{children}</div></div>;
}
