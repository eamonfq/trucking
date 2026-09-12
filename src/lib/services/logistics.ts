import "server-only";
import { addresses, recipients, boxes, invoices, notifications, shipments, supportTickets, trucks, users, drivers } from "@/lib/db/collections";
import { withStore } from "@/lib/db/store";
import { getSession } from "@/lib/auth/actions";
import { clone } from "./delay";
async function all<T>(items: T[], adminOnly = false): Promise<T[]> {
  return withStore(async () => {
    const session = await getSession();
    if (!session || (adminOnly && session.role !== "admin")) throw new Error("No autorizado");
    if (session.role === "admin") return clone(items);
    return clone(items.filter(item => (item as { userId?: string }).userId === session.userId));
  });
}
export const logisticsService = {
  getUsers: () => all(users, true),
  getBoxes: () => all(boxes), getShipments: () => all(shipments),
  getTrucks: () => withStore(async () => {
    const session = await getSession();
    if (!session) throw new Error("No autorizado");
    if (session.role === "admin") return clone(trucks);
    const ids = new Set(boxes.filter(box => box.userId === session.userId).map(box => box.truckId));
    return clone(trucks.filter(truck => ids.has(truck.id)).map(truck => ({ ...truck, notes: undefined, driverName: "", driverId: "", plate: "", boxIds: truck.boxIds.filter(id => boxes.some(box => box.id === id && box.userId === session.userId)), timeline: truck.timeline.map(event => ({ ...event, actor: "A&L", note: undefined })) })));
  }), getInvoices: () => all(invoices),
  getNotifications: () => all(notifications), getAddresses: () => all(addresses),
  getRecipients: () => all(recipients), getDrivers: () => all(drivers, true),
  getSupportTickets: () => all(supportTickets),
  async getTruckById(id: string) { return (await all(trucks, true)).find(item => item.id === id) ?? null; },
  async getUserById(id: string) { return (await all(users, true)).find(item => item.id === id) ?? null; },
  async getBoxByCode(code: string) { return (await all(boxes)).find(item => item.code.toLowerCase() === code.toLowerCase()) ?? null; },
  async getBoxById(id: string) { return (await all(boxes)).find(item => item.id === id) ?? null; },
};
