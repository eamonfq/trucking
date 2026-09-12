import { randomBytes, scrypt as derive, createHash, timingSafeEqual } from "node:crypto";
const scrypt = (password: string, salt: string) => new Promise<Buffer>((resolve, reject) => derive(password, salt, 64, { N: 32768, r: 8, p: 1, maxmem: 64 * 1024 * 1024 }, (error, key) => error ? reject(error) : resolve(key)));
export const randomToken = () => randomBytes(32).toString("base64url");
export const tokenHash = (token: string) => createHash("sha256").update(token).digest("hex");
export async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const key = await scrypt(password, salt);
  return `scrypt$32768$${salt}$${key.toString("hex")}`;
}
export async function checkPassword(password: string, encoded: string) {
  if (password.length > 128) return false;
  const [algorithm, cost, salt, hash] = encoded.split("$");
  if (algorithm !== "scrypt" || cost !== "32768" || !salt || !hash || hash.length !== 128) return false;
  const key = await scrypt(password, salt);
  return timingSafeEqual(key, Buffer.from(hash, "hex"));
}
