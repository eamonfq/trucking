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

export const INVOICE_STATUSES = ["borrador", "emitida", "pago-reportado", "pagada", "vencida", "pendiente-pago-destino"] as const;
export type InvoiceStatus = (typeof INVOICE_STATUSES)[number];

export type Role = "cliente" | "admin" | "operador";

export type WarehouseGrant = { warehouseId: string; receive: boolean; viewContacts: boolean };
export type Warehouse = { kind?:import("./config/warehouses").WarehouseKind; country?:string; state?:string; address?: string; id: string; name: string; city: string; active: boolean; arrivalMessage: string };
export type TruckStop = { warehouseId: string; city: string; arrivalDate: string };

export type User = {
  warehouseGrants?: WarehouseGrant[];
  id: string;
  role: Role;
  firstName: string;
  paternalLastName: string;
  maternalLastName?: string;
  email: string;
  phone: string;
  lockerCode: string;
  rfc?: string;
  active: boolean;
  internalNotes: Array<{ id: string; body: string; actor: string; at: string }>;
  activity: Array<{ id: string; type: string; description: string; actor: string; at: string }>;
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
  receptionGroup?: { id:string; code?:string; index:number; total:number };
  recipientId?: string;
  recipientSnapshot?: { name:string; phone:string; address:Address };
  originWarehouseId?:string;
  originWarehouseName?:string;
  billing?: import("./utils/billing").BillingSnapshot;
  customPriceUsd?: number;
  destinationWarehouseId?: string;
  loadScan?: { at: string; actorId: string; truckId: string };
  unloadScan?: { at: string; actorId: string; warehouseId: string };
  prealertDetails?: { store: string; description: string; declaredValue: number };
  prealertSelection?: { actorId: string; at: string };
  categoryName?: string;
  excessFeeUsd?: number;
  deliveryReceipt?: { receivedBy: string; note: string; deliveredAt: string; actorId: string };
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
  truckId?: string;
  photos?: string[];
  photoFileId?: string;
  timeline: TimelineEvent[];
};

export type Shipment = {
  deliveryMethod?: "sucursal" | "domicilio";
  recipientSnapshot?: { name: string; phone: string; address: Address };
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
  maxWeightLb?:number;
  originWarehouseId?:string;
  originWarehouseName?:string;
  stops?: TruckStop[];
  id: string;
  code: `TR-${string}`;
  plate: string;
  driverName: string;
  departureDate: string;
  route: string;
  destinationCity: string;
  driverId: string;
  status: TruckStatus;
  boxIds: string[];
  capacity: Record<BoxCategoryId, number>;
  notes?: string;
  timeline: TimelineEvent[];
};

export type Driver = {
  id: string;
  name: string;
  phone: string;
  license: string;
  active: boolean;
};

export type InvoiceLine = {
  description?: string;
  categoryName?: string;
  categoryId: BoxCategoryId;
  quantity: number;
  unitPriceUsd: number;
};

export type PaymentRecord = { folio:string; status:"pendiente"|"confirmado"|"rechazado"|"acuerdo"; amountUsd:number; method:string; externalReference?:string; recordedAt:string; actorId:string; actorName:string; warehouseId?:string; warehouseName?:string; customerId:string; invoiceId:string; boxIds:string[]; shipmentId?:string; confirmedAt?:string; confirmedBy?:string; confirmedByName?:string; boxCodes?:string[]; shipmentCodes?:string[] };

export type Invoice = {
  cloverPaymentId?: string;
  payments?: PaymentRecord[];
  collectionReferences?: Array<{reference:string;method:"efectivo"|"destino"|"tarjeta"|"transferencia"|"deposito"|"clover";at:string}>;
  collectionMethod?: "efectivo" | "destino" | "tarjeta" | "transferencia" | "deposito" | "clover";
  excessFeeUsd?: number;
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
  boxIds?: string[];
  receiptFiles?: Array<{ id: string; name: string }>;
  paymentReport?: { amountUsd: number; method: string; reference: string; receiptName?: string; receiptFileId?: string; reportedAt: string };
  paymentReviewNote?: string;
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

export const SUPPORT_STATUSES = ["abierto", "en-revision", "cerrado"] as const;
export type SupportStatus = (typeof SUPPORT_STATUSES)[number];

export type SupportMessage = {
  id: string;
  author: "cliente" | "soporte";
  authorName: string;
  body: string;
  at: string;
};

export type SupportTicket = {
  id: string;
  code: string;
  userId: string;
  subject: string;
  status: SupportStatus;
  createdAt: string;
  updatedAt: string;
  messages: SupportMessage[];
};

export type ClientUser = Omit<User, "internalNotes">;
