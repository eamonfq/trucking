import "server-only";
import { createHash } from "node:crypto";
// MySQL normalizes JSON object key order. Hash semantic content, not serialization order.
export function recordRevision(value: unknown): string {
  const sort=(item:unknown):unknown=>Array.isArray(item)?item.map(sort):item&&typeof item==="object"?Object.fromEntries(Object.entries(item).sort(([a],[b])=>a.localeCompare(b)).map(([key,val])=>[key,sort(val)])):item;
  return createHash("sha256").update(JSON.stringify(sort(JSON.parse(JSON.stringify(value))))).digest("hex");
}
