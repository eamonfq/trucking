import "server-only";
import { billsOfLading } from "@/lib/db/collections";
import { withStore } from "@/lib/db/store";
import { requireAdminUser } from "@/lib/auth/actions";
import { clone } from "./delay";

export const billOfLadingService = {
  list: () => withStore(async () => {
    await requireAdminUser(["camiones"]);
    return clone([...billsOfLading].sort((a, b) => b.createdAt.localeCompare(a.createdAt)));
  }),
  get: (id: string) => withStore(async () => {
    await requireAdminUser(["camiones"]);
    return clone(billsOfLading.find((item) => item.id === id) ?? null);
  }),
};
