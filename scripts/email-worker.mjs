import nextEnv from '@next/env';
import { createHmac } from 'node:crypto';
nextEnv.loadEnvConfig(process.cwd());
if (!process.env.AUTH_SECRET) throw new Error('Falta AUTH_SECRET');
const base = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3100';
const token = createHmac('sha256', process.env.AUTH_SECRET).update('ayl-email-worker').digest('hex');
async function tick() {
  try {
    const result = await fetch(new URL('/api/internal/email-worker',base),{method:'POST',headers:{authorization:`Bearer ${token}`},signal:AbortSignal.timeout(30000)});
    console.log(`${new Date().toISOString()} Worker HTTP ${result.status}`);
  } catch { console.error('Worker: servidor no disponible; se intentará de nuevo.'); }
}
await tick();
if (!process.argv.includes('--once')) setInterval(tick,60000);
