import Image from "next/image";
import Link from "next/link";
import logoAyl from "../../../public/brand/logoayl.png";

/*
  El PNG oficial no tiene transparencia, así que sobre fondos oscuros va dentro
  de una placa blanca y sobre fondos claros se coloca directo.
*/
export function BrandLogo({ inverse = false, className = "h-9 w-auto" }: { inverse?: boolean; className?: string }) {
  const image = <Image src={logoAyl} alt="A&L Trucking Logistics" priority sizes="(max-width: 640px) 140px, 170px" className={className} />;
  return (
    <Link href="/" aria-label="A&L Trucking Logistics, ir al inicio" className={inverse ? "inline-flex self-start rounded-lg bg-white px-3.5 py-3" : "inline-flex"}>
      {image}
    </Link>
  );
}
