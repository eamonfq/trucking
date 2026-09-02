import { addresses, recipients } from "@/lib/data/addresses";
import { boxes } from "@/lib/data/boxes";
import { invoices } from "@/lib/data/invoices";
import { notifications } from "@/lib/data/notifications";
import { shipments } from "@/lib/data/shipments";
import { trucks } from "@/lib/data/trucks";
import { users } from "@/lib/data/users";
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
  async getBoxByCode(code: string) {
    await simulateLatency();
    return clone(boxes.find((box) => box.code.toLowerCase() === code.toLowerCase()) ?? null);
  },
};
