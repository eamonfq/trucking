import type { User } from "@/lib/types";

export const users: User[] = [
  { id: "usr-001", role: "cliente", firstName: "Mariana", paternalLastName: "Demo", maternalLastName: "López", email: "mariana@demo.test", phone: "+525500000001", lockerCode: "AL-MX-0001", rfc: "DELJ900101AB1", active: true, internalNotes: [{ id: "note-001", body: "Prefiere entrega a domicilio cuando está disponible.", actor: "Operaciones A&L", at: "2026-08-28T15:00:00.000Z" }], activity: [{ id: "act-001", type: "alta", description: "Cuenta activada y casillero asignado.", actor: "Sistema", at: "2026-08-01T12:00:00.000Z" }] },
  { id: "usr-002", role: "cliente", firstName: "Diego", paternalLastName: "Demo", email: "diego@demo.test", phone: "+525500000002", lockerCode: "AL-MX-0002", active: true, internalNotes: [], activity: [{ id: "act-002", type: "alta", description: "Cuenta activada y casillero asignado.", actor: "Sistema", at: "2026-08-02T12:00:00.000Z" }] },
  { id: "usr-003", role: "cliente", firstName: "Sofía", paternalLastName: "Demo", maternalLastName: "Ruiz", email: "sofia@demo.test", phone: "+525500000003", lockerCode: "AL-MX-0003", active: false, internalNotes: [], activity: [{ id: "act-003", type: "alta", description: "Cuenta creada; validación documental pendiente.", actor: "Sistema", at: "2026-08-03T12:00:00.000Z" }] },
  { id: "usr-admin", role: "admin", firstName: "Operaciones", paternalLastName: "A&L", email: "admin@demo.test", phone: "+525500000000", lockerCode: "AL-ADMIN", active: true, internalNotes: [], activity: [] },
];

export const demoCredentials: Array<{ identifier: string; password: string; userId: string }> = [
  { identifier: "mariana@demo.test", password: "Demo1234!", userId: "usr-001" },
  { identifier: "AL-MX-0001", password: "Demo1234!", userId: "usr-001" },
  { identifier: "admin@demo.test", password: "Admin1234!", userId: "usr-admin" },
];
