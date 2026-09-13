import { DestinationDesk } from "@/components/admin/destination-desk";
import { getDestinationDesk, getOriginInventory } from "@/lib/auth/warehouse-actions";
import { OriginInventory } from "@/components/admin/origin-inventory";
export default async function Page(){const [destinations,origins]=await Promise.all([getDestinationDesk(),getOriginInventory()]);return <div className="grid gap-6">{origins.length>0&&<OriginInventory data={origins}/>} {(destinations.warehouses.length>0||!origins.length)&&<DestinationDesk data={destinations}/>}</div>;}
