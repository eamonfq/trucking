import { Document, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import { BOX_CATEGORIES, getBoxCategory } from "@/lib/config/box-categories";
import type { Box, Recipient, Shipment, Truck, User } from "@/lib/types";
import { formatUsd } from "@/lib/utils/format";

const styles = StyleSheet.create({
  page: { padding: 38, fontFamily: "Helvetica", fontSize: 9, color: "#1C2B4B" },
  header: { fontSize: 22, fontFamily: "Helvetica-Bold" },
  meta: { marginTop: 6, color: "#5A6680" },
  section: { marginTop: 24, fontSize: 13, fontFamily: "Helvetica-Bold" },
  row: { flexDirection: "row", justifyContent: "space-between", gap: 10, paddingVertical: 8, borderBottom: "1 solid #E3DED5" },
  table: { marginTop: 10 },
  cellCode: { width: "17%", fontFamily: "Helvetica-Bold" },
  cell: { width: "21%" },
  total: { marginTop: 18, fontFamily: "Helvetica-Bold", fontSize: 13 },
});

export function ManifestDocument({ truck, boxes, users, shipments, recipients }: { truck: Truck; boxes: Box[]; users: User[]; shipments: Shipment[]; recipients: Recipient[] }) {
  const total = boxes.reduce((sum, box) => sum + (getBoxCategory(box.categoryId)?.priceUsd ?? 0), 0);
  return <Document title={`Manifiesto ${truck.code}`}><Page size="LETTER" style={styles.page}><Text style={styles.header}>A&amp;L Trucking Logistics · Manifiesto</Text><Text style={styles.meta}>{truck.code} · {truck.route} · salida {truck.departureDate}</Text><Text style={styles.meta}>Placa {truck.plate} · Chofer {truck.driverName}</Text><Text style={styles.section}>Resumen por categoría</Text><View style={styles.table}>{BOX_CATEGORIES.map((category) => { const count = boxes.filter((box) => box.categoryId === category.id).length; return <View key={category.id} style={styles.row}><Text>{category.name}</Text><Text>{count} cajas · {formatUsd(count * category.priceUsd)}</Text></View>; })}</View><Text style={styles.total}>{boxes.length} cajas · Total {formatUsd(total)}</Text><Text style={styles.section}>Detalle de carga</Text><View style={styles.table}><View style={styles.row}><Text style={styles.cellCode}>Caja</Text><Text style={styles.cell}>Cliente</Text><Text style={styles.cell}>Categoría</Text><Text style={styles.cell}>Destinatario</Text></View>{boxes.map((box) => { const user = users.find((item) => item.id === box.userId); const shipment = shipments.find((item) => item.boxIds.includes(box.id)); const recipient = recipients.find((item) => item.id === shipment?.recipientId); return <View key={box.id} style={styles.row}><Text style={styles.cellCode}>{box.code}</Text><Text style={styles.cell}>{user ? `${user.firstName} ${user.paternalLastName}` : "Sin cliente"}</Text><Text style={styles.cell}>{getBoxCategory(box.categoryId)?.name}</Text><Text style={styles.cell}>{recipient?.name ?? "Sin destinatario"}</Text></View>; })}</View><Text style={styles.meta}>Documento operativo para control interno de carga.</Text></Page></Document>;
}
