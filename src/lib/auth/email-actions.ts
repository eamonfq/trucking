"use server";
import { Resend } from "resend";
import { z } from "zod";
import { requireAdminUser } from "./actions";
import { allowAttempt, audit, sql } from "./repository";
import { sendEmail, siteUrl } from "@/lib/services/email";
import { renderEmail } from "@/lib/services/email-template";
import { withStore } from "@/lib/db/store";
import { revalidatePath } from "next/cache";

export async function checkEmailProvider() {
  const actor=await requireAdminUser();
  if (!await allowAttempt(`email-diagnose/${actor.id}`,5,600)) return {ok:false as const,error:"Espera unos minutos antes de consultar de nuevo."};
  if (!process.env.RESEND_API_KEY) return {ok:false as const,error:"Falta RESEND_API_KEY en la configuración privada del servidor."};
  try {
    const result=await new Resend(process.env.RESEND_API_KEY).domains.list();
    if (result.error) {
      const code=/^[a-z_]+$/.test(result.error.name)?result.error.name:"provider_error";
      return {ok:false as const,error:`No pudimos consultar dominios (${code}). Revisa conexión y permisos de la clave en Resend. Una clave de solo envío no permite listar dominios.`};
    }
    return {ok:true as const,domains:result.data.data.map(domain=>({name:domain.name,status:domain.status}))};
  } catch {return {ok:false as const,error:"No pudimos conectar con Resend. No se ha enviado ningún mensaje."};}
}

export async function sendProviderTest(input:unknown) {
  const actor=await requireAdminUser();
  const parsed=z.object({from:z.string().trim().email(),to:z.string().trim().email(),confirmed:z.literal(true)}).safeParse(input);
  if (!parsed.success) return {ok:false as const,error:"Indica remitente, destinatario y confirma que autorizas el envío real."};
  if (!process.env.RESEND_API_KEY) return {ok:false as const,error:"Falta configurar la clave de Resend en el servidor."};
  if (!await allowAttempt(`email-test/${actor.id}`,3,600)) return {ok:false as const,error:"Límite de 3 pruebas cada 10 minutos. Espera antes de reintentar."};
  const message={to:parsed.data.to,subject:"Prueba de correo · A&L",heading:"La comunicación también viaja contigo.",body:"Esta es una prueba autorizada desde el panel operativo de A&L. Confirma la recepción en tu buzón. No contiene enlaces de acceso ni datos de clientes."};
  const queued=await withStore(async()=>{
    const item=await sendEmail(message);
    // Exclude from workers inside the same transaction; only the explicit test can send it.
    await sql().execute("UPDATE email_outbox SET status='failed',attempts=1,last_error='Test awaiting provider result' WHERE id=?",[item.id]);
    return item;
  },true);
  try {
    const result=await new Resend(process.env.RESEND_API_KEY).emails.send({from:`A&L Trucking Logistics <${parsed.data.from}>`,to:message.to,subject:message.subject,...renderEmail(message,siteUrl())},{idempotencyKey:`ayl/${queued.id}`});
    if (result.error || !result.data?.id) throw new Error("Provider rejected test");
    await sql().execute("UPDATE email_outbox SET status='sent',provider_id=?,last_error=NULL,payload=JSON_OBJECT() WHERE id=?",[result.data.id,queued.id]);
    await audit(actor.id,"email.test.accepted");
    revalidatePath("/admin/correos");
    return {ok:true as const,message:"Resend aceptó la prueba. Confirma que llegó al buzón; esto no activa la cola operativa ni acredita entrega."};
  } catch {
    await sql().execute("UPDATE email_outbox SET status='failed',last_error='Test failed: check network, sender domain and recipient restrictions',payload=JSON_OBJECT() WHERE id=?",[queued.id]);
    revalidatePath("/admin/correos");
    return {ok:false as const,error:"No se pudo confirmar el envío. Revisa conexión, dominio del remitente y restricciones del destinatario en Resend. La cola operativa no se activó."};
  }
}
