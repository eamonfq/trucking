import { addresses, recipients } from "@/lib/data/addresses";
import { boxes } from "@/lib/data/boxes";
import { invoices } from "@/lib/data/invoices";
import { notifications } from "@/lib/data/notifications";
import { shipments } from "@/lib/data/shipments";
import { trucks } from "@/lib/data/trucks";
import { users } from "@/lib/data/users";
import { drivers } from "@/lib/data/drivers";
import { clone, simulateLatency } from "@/lib/services/delay";

async function all<T>(items: T[]) {
  await simulateLatency();
  return clone(items);
}

export const logisticsService = {
  getUsers: () => all(users),
  getBoxes: () => all(boxes),
  getShipments: () => all(shipments),
  getTrucks: () => all(trucks),
  getInvoices: () => all(invoices),
  getNotifications: () => all(notifications),
  getAddresses: () => all(addresses),
  getRecipients: () => all(recipients),
  getDrivers: () => all(drivers),
  async getTruckById(id: string) {
    await simulateLatency();
    return clone(trucks.find((truck) => truck.id === id) ?? null);
  },
  async getBoxByCode(code: string) {
    await simulateLatency();
    return clone(boxes.find((box) => box.code.toLowerCase() === code.toLowerCase()) ?? null);
  },
};
