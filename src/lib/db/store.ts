import "server-only";
import { AsyncLocalStorage } from "node:async_hooks";
import type { PoolConnection, RowDataPacket } from "mysql2/promise";
import { pool } from "./pool";

type Entity = { id: string };
type Context = { connection: PoolConnection; data: Record<string, Entity[]>; before: Map<string, string>; writable: boolean; rollback: Array<()=>Promise<void>> };
const context = new AsyncLocalStorage<Context>();
export function transactionConnection() { return context.getStore()?.connection; }
export function onTransactionRollback(work:()=>Promise<void>){const store=context.getStore();if(!store?.writable)throw new Error('No writable transaction');store.rollback.push(work);}
export function collection<T extends Entity>(name: string): T[] {
  // Each request sees its own transaction, never a process-global mutable array.
  function current() {
    const store = context.getStore();
    if (!store) throw new Error(`Repository ${name} requires a database scope`);
    return (store.data[name] ??= []) as T[];
  }
  return new Proxy([] as T[], {
    get: (_, key) => Reflect.get(current(), key),
    set: (_, key, value) => { if (!context.getStore()?.writable) throw new Error("Read-only repository"); return Reflect.set(current(), key, value); },
    deleteProperty: (_, key) => Reflect.deleteProperty(current(), key),
    has: (_, key) => Reflect.has(current(), key),
  });
}

export async function withStore<T>(work: () => Promise<T>, writable = false): Promise<T> {
  const nested = context.getStore();
  if (nested) {
    if (writable && !nested.writable) throw new Error("Cannot mutate a read-only transaction");
    return work();
  }
  const connection = await pool().getConnection();
  const rollback: Array<()=>Promise<void>>=[];
  let committing=false;
  try {
    await connection.beginTransaction();
    // Serializes legacy multi-entity operations across processes. Auth has its own indexed tables.
    if (writable) await connection.query("SELECT id FROM operation_lock WHERE id=1 FOR UPDATE");
    const [rows] = await connection.query<RowDataPacket[]>("SELECT collection_name, entity_id, payload, position_index FROM entities ORDER BY position_index");
    const data: Context["data"] = {};
    const before = new Map<string, string>();
    for (const row of rows) {
      const value = typeof row.payload === "string" ? JSON.parse(row.payload) : row.payload;
      (data[row.collection_name] ??= []).push(value);
      before.set(`${row.collection_name}/${row.entity_id}`, `${row.position_index}:${JSON.stringify(value)}`);
    }
    const result = await context.run({ connection, data, before, writable, rollback }, async () => {
      const value = await work();
      if (writable) {
        const remaining = new Set(before.keys());
        for (const [name, items] of Object.entries(data)) {
          for (const [position, item] of items.entries()) {
            const key = `${name}/${item.id}`;
            remaining.delete(key);
            if (before.get(key) === `${position}:${JSON.stringify(item)}`) continue;
            await connection.execute("INSERT INTO entities(collection_name,entity_id,payload,position_index) VALUES (?,?,?,?) ON DUPLICATE KEY UPDATE payload=VALUES(payload),position_index=VALUES(position_index)", [name, item.id, JSON.stringify(item), position]);
          }
        }
        for (const key of remaining) { const [name, id] = key.split("/"); await connection.execute("DELETE FROM entities WHERE collection_name=? AND entity_id=?", [name, id]); }
      }
      return value;
    });
    committing=true;
    await connection.commit();
    return result;
  } catch (error) {
    await connection.rollback();
    // Never delete external files after an ambiguous commit/network failure.
    if(!committing)for(const undo of rollback){try{await undo();}catch{console.error('R2 rollback cleanup pending; inspect orphaned reception objects.');}}
    throw error;
  }
  finally { connection.release(); }
}
