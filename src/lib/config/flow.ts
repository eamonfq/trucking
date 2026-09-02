export const ORIGIN_MODES = ["casillero", "entrega-directa"] as const;
export const PACKING_MODES = ["cliente", "agencia"] as const;
export const BILLING_MOMENTS = ["al-recibir", "al-despachar"] as const;
export const EXCESS_POLICIES = ["subir-categoria", "recargo", "rechazo"] as const;
export const DELIVERY_MODES = ["sucursal", "domicilio", "ambas"] as const;

export type FlowConfig = {
  originMode: (typeof ORIGIN_MODES)[number];
  packingMode: (typeof PACKING_MODES)[number];
  billingMoment: (typeof BILLING_MOMENTS)[number];
  excessPolicy: (typeof EXCESS_POLICIES)[number];
  deliveryMode: (typeof DELIVERY_MODES)[number];
  exchangeRateMxn: number;
};

export const DEFAULT_FLOW_CONFIG: Readonly<FlowConfig> = {
  originMode: "casillero",
  packingMode: "cliente",
  billingMoment: "al-despachar",
  excessPolicy: "subir-categoria",
  deliveryMode: "ambas",
  exchangeRateMxn: 18.5,
};
