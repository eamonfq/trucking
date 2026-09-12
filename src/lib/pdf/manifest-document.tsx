import { Document, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import { getBoxCategory } from "@/lib/config/box-categories";
import type { Box, Recipient, Shipment, Truck, User } from "@/lib/types";


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
  return <Document title={`Manifiesto ${truck.code}`}><Page size="LETTER" style={styles.page}><Text style={styles.header}>A&amp;L Trucking Logistics · Manifiesto</Text><Text style={styles.meta}>{truck.code} · {truck.route} · salida {truck.departureDate}</Text><Text style={styles.meta}>Placa {truck.plate} · Chofer {truck.driverName}</Text>{truck.stops?.map((stop,index)=><Text key={stop.warehouseId} style={styles.meta}>Parada {index+1}: {stop.city} · Llegada estimada {stop.arrivalDate}</Text>)}<Text style={styles.section}>Resumen por categoría</Text><View style={styles.table}>{Array.from(new Set(boxes.map(box=>box.categoryId)),id=>({id,name:boxes.find(box=>box.categoryId===id)?.categoryName ?? getBoxCategory(id)?.name ?? id})).map((category) => { const count = boxes.filter((box) => box.categoryId === category.id).length; return <View key={category.id} style={styles.row}><Text>{category.name}</Text><Text>{count} cajas</Text></View>; })}</View><Text style={styles.total}>{boxes.length} cajas en esta guía máster</Text><Text style={styles.section}>Detalle de carga</Text><View style={styles.table}><View style={styles.row}><Text style={styles.cellCode}>Caja</Text><Text style={styles.cell}>Cliente</Text><Text style={styles.cell}>Categoría</Text><Text style={styles.cell}>Destinatario</Text></View>{boxes.map((box) => { const user = users.find((item) => item.id === box.userId); const shipment = shipments.find((item) => item.boxIds.includes(box.id)); const recipient = shipment?.recipientSnapshot ?? recipients.find((item) => item.id === shipment?.recipientId); return <View key={box.id} style={styles.row}><Text style={styles.cellCode}>{box.code}</Text><Text style={styles.cell}>{user ? `${user.firstName} ${user.paternalLastName}` : "Sin cliente"}</Text><Text style={styles.cell}>{box.categoryName ?? getBoxCategory(box.categoryId)?.name ?? box.categoryId}</Text><Text style={styles.cell}>{recipient?.name ?? "Sin destinatario"}</Text></View>; })}</View><Text style={styles.meta}>Documento operativo para control interno de carga. Los importes se consultan en las facturas emitidas.</Text></Page></Document>;
}
