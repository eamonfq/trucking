import {requireAdminUser} from "@/lib/auth/actions";
import {getAdministrativeStaff} from "@/lib/auth/staff-actions";
import {StaffManager} from "@/components/admin/staff-manager";
import {SectionTitle} from "@/components/cliente/section-title";
import {adminStaff} from "@/lib/i18n/catalogs/admin-staff";
import {getT} from "@/lib/i18n/server";
export default async function StaffPage(){
 const actor=await requireAdminUser(),staff=await getAdministrativeStaff(),t=await getT(adminStaff);
 return <><SectionTitle eyebrow={t("Equipo y seguridad")} title={t("Cada persona. El acceso correcto.")} description={t("Invita a tu equipo y asigna las herramientas que necesita. Los operadores de almacén conservan sus accesos independientes.")}/><StaffManager staff={staff} actorId={actor.id}/></>;
}
