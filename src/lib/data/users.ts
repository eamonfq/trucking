import type { User } from "@/lib/types";

export const users: User[] = [
  { id: "usr-001", role: "cliente", firstName: "Mariana", paternalLastName: "Demo", maternalLastName: "López", email: "mariana@demo.test", phone: "+525500000001", lockerCode: "AL-MX-0001" },
  { id: "usr-002", role: "cliente", firstName: "Diego", paternalLastName: "Demo", email: "diego@demo.test", phone: "+525500000002", lockerCode: "AL-MX-0002" },
  { id: "usr-003", role: "cliente", firstName: "Sofía", paternalLastName: "Demo", maternalLastName: "Ruiz", email: "sofia@demo.test", phone: "+525500000003", lockerCode: "AL-MX-0003" },
  { id: "usr-admin", role: "admin", firstName: "Operaciones", paternalLastName: "A&L", email: "admin@demo.test", phone: "+525500000000", lockerCode: "AL-ADMIN" },
];

export const demoCredentials = [
  { identifier: "mariana@demo.test", password: "Demo1234!", userId: "usr-001" },
  { identifier: "AL-MX-0001", password: "Demo1234!", userId: "usr-001" },
  { identifier: "admin@demo.test", password: "Admin1234!", userId: "usr-admin" },
] as const;
