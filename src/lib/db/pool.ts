import "server-only";
import mysql, { type Pool } from "mysql2/promise";

const globalDb = globalThis as unknown as { aylPool?: Pool };
export function pool() {
  if (!process.env.DATABASE_URL) throw new Error("Falta DATABASE_URL. Ejecuta npm run db:migrate.");
  return globalDb.aylPool ??= mysql.createPool({ uri: process.env.DATABASE_URL, connectionLimit: 10, timezone: "Z", charset: "utf8mb4" });
}
