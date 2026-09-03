import Link from "next/link";
import { BrandLogo } from "@/components/marketing/brand-logo";
import { COMPANY } from "@/lib/config/company";

const service = [
  { label: "Tarifas", href: "/#tarifas" },
  { label: "Cómo funciona", href: "/#proceso" },
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
        <FooterColumn title="Contacto">
          <span className="pending-data w-fit rounded-sm px-1.5 text-sm text-[#A8B2CA]">Teléfono · {COMPANY.supportPhone}</span>
          <span className="pending-data w-fit rounded-sm px-1.5 text-sm text-[#A8B2CA]">Correo · {COMPANY.supportEmail}</span>
          <span className="pending-data w-fit rounded-sm px-1.5 text-sm text-[#A8B2CA]">Bodega Miami · dato pendiente</span>
        </FooterColumn>
      </div>
      <div className="border-t border-white/10">
        <div className="mx-auto flex max-w-[90rem] flex-col gap-2 px-5 py-6 text-xs text-[#8A96B4] sm:flex-row sm:justify-between sm:px-8 lg:px-18">
          <span>© 2026 A&amp;L Trucking Logistics</span>
          <div className="flex gap-6"><span>Aviso de privacidad</span><span>Términos y condiciones</span></div>
        </div>
      </div>
    </footer>
  );
}

function FooterColumn({ title, children }: { title: string; children: React.ReactNode }) {
  return <div className="flex flex-col gap-4"><p className="text-over font-semibold uppercase text-brand-300">{title}</p><div className="flex flex-col gap-3">{children}</div></div>;
}
