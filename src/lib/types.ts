import type { BoxCategoryId, Dimensions } from "@/lib/config/box-categories";

export const BOX_STATUSES = [
  "pre-alertada",
  "recibida",
  "categorizada",
  "en-bodega",
  "cargada-en-camion",
  "en-transito",
  "en-destino",
  "entregada",
  "excede-categoria",
  "rechazada",
] as const;
export type BoxStatus = (typeof BOX_STATUSES)[number];

export const SHIPMENT_STATUSES = ["pendiente", "confirmado", "en-transito", "en-destino", "entregado"] as const;
export type ShipmentStatus = (typeof SHIPMENT_STATUSES)[number];

export const TRUCK_STATUSES = ["planificado", "cargando", "despachado", "en-frontera", "en-destino", "cerrado"] as const;
export type TruckStatus = (typeof TRUCK_STATUSES)[number];

export const INVOICE_STATUSES = ["borrador", "emitida", "pago-reportado", "pagada", "vencida"] as const;
export type InvoiceStatus = (typeof INVOICE_STATUSES)[number];

export type Role = "cliente" | "admin";

export type User = {
  id: string;
  role: Role;
  firstName: string;
  paternalLastName: string;
  maternalLastName?: string;
  email: string;
  phone: string;
  lockerCode: string;
};

export type TransitionEvent = {
  from: string | null;
  to: string;
  actor: string;
  at: string;
  note?: string;
};

export type Address = {
  id: string;
  userId: string;
  label: string;
  street: string;
  exteriorNumber: string;
  interiorNumber?: string;
  neighborhood: string;
  postalCode: string;
  municipality: string;
  state: string;
  references?: string;
};

export type Recipient = {
  id: string;
  userId: string;
  name: string;
  phone: string;
  addressId: string;
};

export type TimelineEvent = TransitionEvent;

export type Box = {
  id: string;
  code: `BX-${string}`;
  userId: string;
  categoryId: BoxCategoryId;
  status: BoxStatus;
  dimensions: Dimensions;
  weightLb: number;
  originTracking?: string;
  receivedAt?: string;
  shipmentId?: string;
  timeline: TimelineEvent[];
};

export type Shipment = {
  id: string;
  code: `SH-${string}`;
  userId: string;
  recipientId: string;
  boxIds: string[];
  truckId?: string;
  status: ShipmentStatus;
  destinationCity: string;
  timeline: TimelineEvent[];
};

export type Truck = {
  id: string;
  code: `TR-${string}`;
  plate: string;
  driverName: string;
  departureDate: string;
  route: string;
  status: TruckStatus;
  boxIds: string[];
  timeline: TimelineEvent[];
};

export type InvoiceLine = {
  categoryId: BoxCategoryId;
  quantity: number;
  unitPriceUsd: number;
};

export type Invoice = {
  id: string;
  number: string;
  userId: string;
  shipmentId: string;
  status: InvoiceStatus;
  issuedAt: string;
  dueAt: string;
  lines: InvoiceLine[];
  insuranceUsd: number;
  homeDeliveryUsd: number;
  timeline: TimelineEvent[];
};

export type Notification = {
  id: string;
  userId: string;
  title: string;
  body: string;
  createdAt: string;
  read: boolean;
};
