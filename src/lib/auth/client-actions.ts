"use server";

import { sendEmail } from "@/lib/services/email";
import { simulateLatency } from "@/lib/services/delay";

export async function recordClientAction(input: { kind: "prealert" | "shipment" | "payment" | "support" | "password"; email?: string }) {
  await simulateLatency();
  const copy = {
    prealert: ["Pre-alerta registrada", "Tu compra quedó registrada y aparecerá en Mis cajas cuando llegue a bodega."],
    shipment: ["Envío confirmado", "Recibimos tu solicitud de envío. Te notificaremos cuando sea asignada a un camión."],
    payment: ["Pago reportado", "Recibimos los datos de tu pago y el equipo operativo los revisará."],
    support: ["Ticket recibido", "Tu mensaje de soporte quedó registrado. Te avisaremos cuando haya una respuesta."],
    password: ["Contraseña actualizada", "La contraseña de tu cuenta se actualizó en el entorno demo."],
  }[input.kind];
  const email = input.email ? await sendEmail({ to: input.email, subject: copy[0], heading: copy[0], body: copy[1], actionLabel: "Abrir mi panel", actionUrl: `${process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"}/cliente` }) : { status: "simulated" as const };
  return { ok: true as const, emailStatus: email.status };
}
