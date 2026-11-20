import { Document, Page, StyleSheet, Text, View, type Styles } from "@react-pdf/renderer";
import type { ComponentProps, ReactNode } from "react";
import type { BillOfLadingContent } from "@/lib/schemas/bill-of-lading";
import { billOfLadingTotals, usDate } from "@/lib/utils/bill-of-lading";

/** Bill of Lading in the VICS short-form layout the client already uses on paper. Values come only from the saved document. */
const LINE = 0.75;
const s = StyleSheet.create({
  page: { paddingTop: 28, paddingBottom: 28, paddingHorizontal: 32, fontFamily: "Helvetica", fontSize: 7.5, color: "#000" },
  top: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 6 },
  title: { fontFamily: "Helvetica-Bold", fontSize: 11 },
  row: { flexDirection: "row", borderLeftWidth: LINE, borderRightWidth: LINE, borderBottomWidth: LINE },
  first: { borderTopWidth: LINE },
  divider: { borderRightWidth: LINE },
  band: { backgroundColor: "#e6e6e6", fontFamily: "Helvetica-Bold", fontSize: 8, textAlign: "center", paddingVertical: 2.5 },
  bandBottom: { borderBottomWidth: LINE },
  pad: { paddingHorizontal: 4, paddingVertical: 3 },
  bold: { fontFamily: "Helvetica-Bold" },
  value: { fontSize: 8.5 },
  big: { fontSize: 11 },
  small: { fontSize: 5.8, lineHeight: 1.25 },
  head: { fontFamily: "Helvetica-Bold", fontSize: 7.5, textAlign: "center", paddingVertical: 2.5 },
  cell: { paddingHorizontal: 3, paddingVertical: 2, justifyContent: "center" },
  center: { textAlign: "center" },
  shade: { backgroundColor: "#e6e6e6" },
  check: { flexDirection: "row", alignItems: "center", marginRight: 9, marginTop: 2 },
  box: { width: 7, height: 7, borderWidth: LINE, marginRight: 3 },
  mark: { position: "absolute", top: -0.6, left: 1.1, fontFamily: "Helvetica-Bold", fontSize: 7 },
  circle: { width: 12, height: 12, borderRadius: 6, borderWidth: LINE, alignItems: "center", justifyContent: "center" },
  underline: { textDecoration: "underline" },
});

/** Never split words with hyphens: form labels and VINs must stay readable. Only this document is affected. */
const whole = (word: string) => [word];
const T = (props: ComponentProps<typeof Text>) => <Text hyphenationCallback={whole} {...props} />;

const fmt = (value?: number) => (value === undefined ? "" : value.toLocaleString("en-US", { maximumFractionDigits: 2 }));
const blank = (value: string, width = 14) => value || "_".repeat(width);

function Check({ on, label }: { on: boolean; label: string }) {
  return <View style={s.check}><View style={s.box}>{on ? <T style={s.mark}>X</T> : null}</View><T>{label}</T></View>;
}
function Cell({ width, children, style, last }: { width: string; children?: ReactNode; style?: Styles[string]; last?: boolean }) {
  return <View style={[s.cell, { width }, last ? {} : s.divider, style ?? {}]}>{children}</View>;
}
function YesNo({ value }: { value: "" | "Y" | "N" }) {
  return <View style={{ flexDirection: "row", width: "100%" }}>
    {(["Y", "N"] as const).map((option, index) => <View key={option} style={[{ width: "50%", alignItems: "center", justifyContent: "center", minHeight: 14 }, index === 0 ? s.divider : {}]}>
      {value === option ? <View style={s.circle}><T style={s.bold}>{option}</T></View> : <T>{option}</T>}
    </View>)}
  </View>;
}

const ORDER = { number: "36%", packages: "10%", weight: "9%", pallet: "10%", info: "35%" };
const LINE_W = { hQty: "4%", hType: "6%", pQty: "5%", pType: "10%", weight: "7%", hm: "4%", desc: "50%", nmfc: "8%", cls: "6%" };

export function BillOfLadingDocument({ bill, code }: { bill: BillOfLadingContent; code?: string }) {
  const totals = billOfLadingTotals(bill);
  const orderRows = [...bill.orders, ...Array.from({ length: Math.max(0, 2 - bill.orders.length) }, () => null)];
  const hasOrderTotals = bill.orders.some((order) => order.packages !== undefined || order.weightLb !== undefined);
  const hasLineTotals = bill.lines.some((line) => line.packageQty !== undefined || line.handlingQty !== undefined || line.weightLb !== undefined);
  const lineRows = [...bill.lines, ...Array.from({ length: Math.max(0, 3 - bill.lines.length) }, () => null)];
  return <Document title={`Bill of Lading ${bill.number || code || ""}`.trim()} author={bill.carrierName || "A&L Trucking Logistics"}>
    <Page size="LETTER" style={s.page}>
      <View fixed style={s.top}>
        <T>Date <T style={s.value}>{usDate(bill.date)}</T></T>
        <T style={s.title}>BILL OF LADING – SHORT FORM – NOT NEGOTIABLE</T>
        <T render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`} />
      </View>

      <View style={[s.row, s.first]} wrap={false}>
        <View style={[{ width: "50%" }, s.divider]}><T style={[s.band, s.bandBottom]}>SHIP FROM</T><View style={[s.pad, { minHeight: 40, justifyContent: "space-between" }]}><T style={s.value}>{bill.shipFrom}</T><T style={{ marginTop: 4 }}>SID No.: <T style={s.big}>{bill.sidNumber}</T></T></View></View>
        <View style={[{ width: "50%" }, s.pad]}><T style={[s.bold, { fontSize: 9 }]}>Bill of Lading Number: <T style={[s.big, { fontFamily: "Helvetica" }]}>{bill.number}</T></T></View>
      </View>
      <View style={s.row} wrap={false}>
        <View style={[{ width: "50%" }, s.divider]}><T style={[s.band, s.bandBottom]}>SHIP TO</T><View style={[s.pad, { minHeight: 32 }]}><T style={s.value}>{bill.shipTo}</T></View></View>
        <View style={[{ width: "50%" }, s.pad]}><T style={[s.bold, { fontSize: 8.5 }]}>Carrier Name: <T style={[s.value, { fontFamily: "Helvetica" }]}>{bill.carrierName}</T></T><T style={{ marginTop: 5 }}>Trailer number: <T style={s.value}>{bill.trailerNumber}</T></T><T style={{ marginTop: 2 }}>Serial number(s): <T style={s.value}>{bill.serialNumbers}</T></T></View>
      </View>
      <View style={s.row} wrap={false}>
        <View style={[{ width: "50%" }, s.divider]}><T style={[s.band, s.bandBottom]}>THIRD PARTY FREIGHT CHARGES BILL TO</T><View style={[s.pad, { minHeight: 32 }]}><T style={s.value}>{bill.billTo}</T></View></View>
        <View style={[{ width: "50%" }, s.pad]}><T style={[s.bold, { fontSize: 8.5 }]}>SCAC: <T style={[s.value, { fontFamily: "Helvetica" }]}>{bill.scac}</T></T><T style={{ marginTop: 8 }}>Pro Number: <T style={s.value}>{bill.proNumber}</T></T></View>
      </View>
      <View style={s.row} wrap={false}>
        <View style={[{ width: "50%" }, s.divider, s.pad, { minHeight: 40 }]}><T style={[s.bold, { fontSize: 8.5 }]}>Special Instructions:</T><T style={{ marginTop: 1, fontSize: 6.8 }}>{bill.specialInstructions}</T></View>
        <View style={{ width: "50%" }}>
          <View style={[s.pad, { borderBottomWidth: LINE }]}><T><T style={[s.bold, { fontSize: 8.5 }]}>Freight Charge Terms </T><T style={[s.bold, { fontSize: 6.5 }]}>(Freight charges are prepaid unless marked otherwise):</T></T><View style={{ flexDirection: "row" }}><Check on={bill.freightTerms === "prepaid"} label="Prepaid" /><Check on={bill.freightTerms === "collect"} label="Collect" /><Check on={bill.freightTerms === "third-party"} label="3rd Party" /></View></View>
          <View style={s.pad}><Check on={bill.masterBol} label="Master bill of lading with attached underlying bills of lading." /></View>
        </View>
      </View>

      <View style={s.row} wrap={false} minPresenceAhead={60}><T style={[s.band, { width: "100%" }]}>CUSTOMER ORDER INFORMATION</T></View>
      <View style={s.row} wrap={false}>
        <Cell width={ORDER.number}><T style={s.bold}>Customer Order No.</T></Cell>
        <Cell width={ORDER.packages}><T style={[s.bold, s.center]}># of Packages</T></Cell>
        <Cell width={ORDER.weight}><T style={[s.bold, s.center]}>Weight</T></Cell>
        <Cell width={ORDER.pallet} style={{ padding: 0 }}><T style={[s.bold, s.center, { paddingTop: 2 }]}>Pallet/Slip</T><T style={[s.center, { fontSize: 6, paddingBottom: 2 }]}>(circle one)</T></Cell>
        <Cell width={ORDER.info} last><T style={s.bold}>Additional Shipper Information</T></Cell>
      </View>
      {orderRows.map((order, index) => <View key={order?.id ?? `empty-order-${index}`} style={s.row} wrap={false}>
        <Cell width={ORDER.number}><T>{order?.orderNumber}</T></Cell>
        <Cell width={ORDER.packages}><T style={s.center}>{fmt(order?.packages)}</T></Cell>
        <Cell width={ORDER.weight}><T style={s.center}>{fmt(order?.weightLb)}</T></Cell>
        <Cell width={ORDER.pallet} style={{ padding: 0 }}><YesNo value={order?.palletSlip ?? ""} /></Cell>
        <Cell width={ORDER.info} last><T style={{ fontSize: 6.5 }}>{order?.info}</T></Cell>
      </View>)}
      <View style={s.row} wrap={false}>
        <Cell width={ORDER.number}><T style={[s.bold, { fontSize: 8.5 }]}>Grand Total</T></Cell>
        <Cell width={ORDER.packages}><T style={[s.center, s.bold]}>{hasOrderTotals ? fmt(totals.orderPackages) : ""}</T></Cell>
        <Cell width={ORDER.weight}><T style={[s.center, s.bold]}>{hasOrderTotals ? fmt(totals.orderWeightLb) : ""}</T></Cell>
        <Cell width="45%" style={s.shade} last />
      </View>

      <View style={s.row} wrap={false} minPresenceAhead={70}><T style={[s.band, { width: "100%" }]}>CARRIER INFORMATION</T></View>
      <View style={s.row} wrap={false}>
        <View style={[{ width: "10%" }, s.divider]}><T style={[s.head, { borderBottomWidth: LINE }]}>Handling Unit</T><View style={{ flexDirection: "row", flexGrow: 1 }}><Cell width="40%"><T style={[s.bold, s.center]}>Qty</T></Cell><Cell width="60%" last><T style={[s.bold, s.center]}>Type</T></Cell></View></View>
        <View style={[{ width: "15%" }, s.divider]}><T style={[s.head, { borderBottomWidth: LINE }]}>Package</T><View style={{ flexDirection: "row", flexGrow: 1 }}><Cell width="33.3%"><T style={[s.bold, s.center]}>Qty</T></Cell><Cell width="66.7%" last><T style={[s.bold, s.center]}>Type</T></Cell></View></View>
        <Cell width={LINE_W.weight}><T style={[s.bold, s.center]}>Weight</T></Cell>
        <Cell width={LINE_W.hm}><T style={[s.bold, s.center]}>HM (X)</T></Cell>
        <Cell width={LINE_W.desc}><T style={[s.bold, { fontSize: 8.5 }]}>Commodity Description</T><T style={s.small}>Commodities requiring special or additional care or attention in handling or stowing must be so marked and packaged as to ensure safe transportation with ordinary care. See Section 2(e) of NMFC item 360</T></Cell>
        <View style={{ width: "14%" }}><T style={[s.head, { borderBottomWidth: LINE }]}>LTL Only</T><View style={{ flexDirection: "row", flexGrow: 1 }}><Cell width="57.1%"><T style={[s.bold, s.center]}>NMFC No.</T></Cell><Cell width="42.9%" last><T style={[s.bold, s.center]}>Class</T></Cell></View></View>
      </View>
      {lineRows.map((line, index) => <View key={line?.id ?? `empty-line-${index}`} style={[s.row, { minHeight: 13 }]} wrap={false}>
        <Cell width={LINE_W.hQty}><T style={s.center}>{fmt(line?.handlingQty)}</T></Cell>
        <Cell width={LINE_W.hType}><T style={s.center}>{line?.handlingType}</T></Cell>
        <Cell width={LINE_W.pQty}><T style={s.center}>{fmt(line?.packageQty)}</T></Cell>
        <Cell width={LINE_W.pType}><T style={s.center}>{line?.packageType}</T></Cell>
        <Cell width={LINE_W.weight}><T style={s.center}>{fmt(line?.weightLb)}</T></Cell>
        <Cell width={LINE_W.hm}><T style={[s.center, s.bold]}>{line?.hazmat ? "X" : ""}</T></Cell>
        <Cell width={LINE_W.desc}><T>{line?.description}</T></Cell>
        <Cell width={LINE_W.nmfc}><T style={s.center}>{line?.nmfc}</T></Cell>
        <Cell width={LINE_W.cls} last><T style={s.center}>{line?.freightClass}</T></Cell>
      </View>)}
      <View style={s.row} wrap={false}>
        <Cell width={LINE_W.hQty}><T style={[s.center, s.bold]}>{hasLineTotals && totals.handlingQty ? fmt(totals.handlingQty) : ""}</T></Cell>
        <Cell width={LINE_W.hType} style={s.shade} />
        <Cell width={LINE_W.pQty}><T style={[s.center, s.bold]}>{hasLineTotals ? fmt(totals.packageQty) : ""}</T></Cell>
        <Cell width={LINE_W.pType} style={s.shade} />
        <Cell width={LINE_W.weight}><T style={[s.center, s.bold]}>{hasLineTotals ? fmt(totals.weightLb) : ""}</T></Cell>
        <Cell width={LINE_W.hm} style={s.shade} />
        <Cell width={LINE_W.desc}><T style={[s.bold, { fontSize: 8.5 }]}>Grand Total</T></Cell>
        <Cell width="14%" style={s.shade} last />
      </View>

      <View wrap={false}>
        <View style={[s.row, { borderLeftWidth: 0, borderRightWidth: 0, borderBottomWidth: 0, paddingVertical: 4 }]}>
          <View style={{ width: "55%", paddingRight: 8 }}><T style={{ fontSize: 6.5 }}>Where the rate is dependent on value, shippers are required to state specifically in writing the agreed or declared value of the property as follows: “The agreed or declared value of the property is specifically stated by the shipper to be not exceeding <T style={s.underline}>{blank(bill.declaredValue)}</T> per <T style={s.underline}>{blank(bill.declaredValuePer)}</T>.”</T></View>
          <View style={{ width: "45%" }}><T><T style={[s.bold, { fontSize: 8.5 }]}>COD Amount: </T><T style={[s.value, s.underline]}>{blank(bill.codAmount, 30)}</T></T><View style={{ flexDirection: "row", flexWrap: "wrap", alignItems: "center", marginTop: 2 }}><T style={{ marginRight: 5, marginTop: 2 }}>Fee terms:</T><Check on={bill.codFeeTerms === "collect"} label="Collect" /><Check on={bill.codFeeTerms === "prepaid"} label="Prepaid" /><Check on={bill.customerCheckAcceptable} label="Customer check acceptable" /></View></View>
        </View>
        <View style={[s.row, s.first]}><T style={[s.bold, s.pad, { width: "100%", textAlign: "center", fontSize: 8 }]}>Note: Liability limitation for loss or damage in this shipment may be applicable. See 49 USC § 14706(c)(1)(A) and (B).</T></View>
        <View style={s.row}>
          <View style={[{ width: "50%" }, s.divider, s.pad]}><T style={{ fontSize: 6.3 }}>Received, subject to individually determined rates or contracts that have been agreed upon in writing between the carrier and shipper, if applicable, otherwise to the rates, classifications, and rules that have been established by the carrier and are available to the shipper, on request, and to all applicable state and federal regulations.</T></View>
          <View style={[{ width: "50%" }, s.pad]}><T style={{ fontSize: 8 }}>The carrier shall not make delivery of this shipment without payment of charges and all other lawful fees.</T><T style={{ marginTop: 4 }}><T style={[s.bold, { fontSize: 8.5 }]}>Shipper Signature </T><T style={[s.value, s.underline]}>{blank(bill.shipperSignature, 40)}</T></T></View>
        </View>
        <View style={s.row}>
          <View style={[{ width: "30%" }, s.divider, s.pad]}><T style={[s.bold, { fontSize: 8.5 }]}>Shipper Signature/Date</T><View style={{ flexDirection: "row", justifyContent: "space-between", borderBottomWidth: 0.5, marginTop: 3, paddingBottom: 1 }}><T style={s.value}>{bill.shipperSignature}</T><T style={s.value}>{usDate(bill.shipperSignatureDate)}</T></View><T style={[s.small, { marginTop: 3 }]}>This is to certify that the above named materials are properly classified, packaged, marked, and labeled, and are in proper condition for transportation according to the applicable regulations of the DOT.</T></View>
          <View style={[{ width: "15%" }, s.divider, s.pad]}><T style={[s.bold, { fontSize: 8.5 }]}>Trailer Loaded:</T><Check on={bill.trailerLoaded === "shipper"} label="By shipper" /><Check on={bill.trailerLoaded === "driver"} label="By driver" /></View>
          <View style={[{ width: "25%" }, s.divider, s.pad]}><T style={[s.bold, { fontSize: 8.5 }]}>Freight Counted:</T><Check on={bill.freightCounted === "shipper"} label="By shipper" /><Check on={bill.freightCounted === "driver-pallets"} label="By driver/pallets said to contain" /><Check on={bill.freightCounted === "driver-pieces"} label="By driver/pieces" /></View>
          <View style={[{ width: "30%" }, s.pad]}><T style={[s.bold, { fontSize: 8.5 }]}>Carrier Signature/Pickup Date</T><View style={{ flexDirection: "row", justifyContent: "space-between", borderBottomWidth: 0.5, marginTop: 3, paddingBottom: 1 }}><T style={s.value}>{bill.carrierSignature}</T><T style={s.value}>{usDate(bill.carrierSignatureDate)}</T></View><T style={[s.small, { marginTop: 3 }]}>Carrier acknowledges receipt of packages and required placards. Carrier certifies emergency response information was made available and/or carrier has the DOT emergency response guidebook or equivalent documentation in the vehicle. Property described above is received in good order, except as noted.</T></View>
        </View>
      </View>
    </Page>
  </Document>;
}
