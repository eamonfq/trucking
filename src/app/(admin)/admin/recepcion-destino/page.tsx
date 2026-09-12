import { DestinationDesk } from "@/components/admin/destination-desk";
import { getDestinationDesk } from "@/lib/auth/warehouse-actions";
import { SectionTitle } from "@/components/cliente/section-title";
export default async function Page(){return <><SectionTitle eyebrow="Descarga" title="Recepción en destino" description="Selecciona almacén y viaje. Confirma la llegada física escaneando cada paquete."/><div className="mt-7"><DestinationDesk data={await getDestinationDesk()}/></div></>;}
