import {requireAdminUser} from "@/lib/auth/actions";
import {getDeletionDirectory} from "@/lib/auth/deletion-actions";
import {DeletionManager} from "@/components/admin/deletion-manager";
import {SectionTitle} from "@/components/cliente/section-title";
import {adminDeletion} from "@/lib/i18n/catalogs/admin-deletion";
import {getT} from "@/lib/i18n/server";
export default async function DeletionPage({searchParams}:{searchParams:Promise<{usuario?:string|string[]}>}){await requireAdminUser();const params=await searchParams;const t=await getT(adminDeletion);const userId=typeof params.usuario==="string"?params.usuario:undefined;return <><SectionTitle eyebrow={t("Administración completa")} title={t("Eliminar registros de prueba")} description={t("Revisa el alcance antes de confirmar. Las unidades de una recepción y sus documentos vinculados se gestionan juntas.")}/><DeletionManager key={userId??"directory"} initialUserId={userId} data={await getDeletionDirectory()}/></>;}
