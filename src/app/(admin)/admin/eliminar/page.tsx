import {requireAdminUser} from "@/lib/auth/actions";
import {getDeletionDirectory} from "@/lib/auth/deletion-actions";
import {DeletionManager} from "@/components/admin/deletion-manager";
import {SectionTitle} from "@/components/cliente/section-title";
export default async function DeletionPage(){await requireAdminUser();return <><SectionTitle eyebrow="Administración completa" title="Eliminar registros de prueba" description="Revisa el alcance antes de confirmar. Las unidades de una recepción y sus documentos vinculados se gestionan juntas."/><DeletionManager data={await getDeletionDirectory()}/></>;}
