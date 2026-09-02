import type { Address, Recipient } from "@/lib/types";

export const addresses: Address[] = [
  { id: "addr-001", userId: "usr-001", label: "Casa demo", street: "Calle de Ejemplo", exteriorNumber: "101", neighborhood: "Colonia Centro", postalCode: "06000", municipality: "Cuauhtémoc", state: "Ciudad de México", references: "Datos ficticios para demostración" },
  { id: "addr-002", userId: "usr-002", label: "Oficina demo", street: "Avenida Muestra", exteriorNumber: "202", interiorNumber: "3", neighborhood: "Colonia Demo", postalCode: "64000", municipality: "Monterrey", state: "Nuevo León", references: "Datos ficticios para demostración" },
  { id: "addr-003", userId: "usr-003", label: "Casa demo", street: "Circuito de Prueba", exteriorNumber: "303", neighborhood: "Colonia Modelo", postalCode: "44100", municipality: "Guadalajara", state: "Jalisco", references: "Datos ficticios para demostración" },
];

export const recipients: Recipient[] = [
  { id: "rec-001", userId: "usr-001", name: "Elena Demo", phone: "+525500000011", addressId: "addr-001" },
  { id: "rec-002", userId: "usr-002", name: "Carlos Demo", phone: "+525500000012", addressId: "addr-002" },
  { id: "rec-003", userId: "usr-003", name: "Andrea Demo", phone: "+525500000013", addressId: "addr-003" },
];
