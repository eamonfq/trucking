import Image from "next/image";
import Link from "next/link";
import logoAyl from "../../../public/brand/logoayl.png";

export function BrandLogo({ inverse = false }: { inverse?: boolean }) {
  return (
    <Link
      href="/"
      className={`inline-flex items-center overflow-hidden rounded-xl bg-white px-2 py-1 shadow-[0_8px_24px_rgba(18,29,53,.09)] ${inverse ? "ring-1 ring-white/15" : "border border-stone-200/70"}`}
    >
      <Image
        src={logoAyl}
        alt="A&L Trucking Logistics"
        priority
        sizes="(max-width: 640px) 120px, 138px"
        className="h-10 w-auto sm:h-11"
      />
    </Link>
  );
}
