import {requireAdminUser} from "@/lib/auth/actions";
import {getAdministrativeStaff} from "@/lib/auth/staff-actions";
import {StaffManager} from "@/components/admin/staff-manager";
import {SectionTitle} from "@/components/cliente/section-title";
export default async function StaffPage(){
 const actor=await requireAdminUser(),staff=await getAdministrativeStaff();
 return <><SectionTitle eyebrow="Equipo y seguridad" title="Cada persona. El acceso correcto." description="Invita a tu equipo y asigna las herramientas que necesita. Los operadores de almacén conservan sus accesos independientes."/><StaffManager staff={staff} actorId={actor.id}/></>;
}
