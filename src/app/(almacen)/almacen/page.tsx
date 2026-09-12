import { DestinationDesk } from "@/components/admin/destination-desk";
import { getDestinationDesk } from "@/lib/auth/warehouse-actions";
export default async function Page(){return <DestinationDesk data={await getDestinationDesk()}/>;}
