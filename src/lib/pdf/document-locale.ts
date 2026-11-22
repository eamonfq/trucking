import "server-only";
import type { RowDataPacket } from "mysql2/promise";
import { pool } from "@/lib/db/pool";
import { isLocale, type Locale } from "@/lib/i18n/config";
import { userLocale } from "@/lib/i18n/user-locale";

/**
 * Language of a customer's documents (invoice and receiving receipt): their saved preference
 * (`users.preferredLocale`), Spanish otherwise. Reads only that field, without loading the whole store.
 */
export async function customerLocale(userId: string | undefined): Promise<Locale> {
  if (!userId) return userLocale(null);
  const [rows] = await pool().execute<RowDataPacket[]>("SELECT JSON_UNQUOTE(JSON_EXTRACT(payload,'$.preferredLocale')) AS locale FROM entities WHERE collection_name='users' AND entity_id=?", [userId]);
  const saved = rows[0]?.locale;
  return userLocale(isLocale(saved) ? { preferredLocale: saved } : null);
}
