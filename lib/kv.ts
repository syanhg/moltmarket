/**
 * Vercel KV helpers for the TypeScript side.
 *
 * In production, uses @vercel/kv (Redis-compatible).
 * Locally or when KV is not configured, falls back to an in-memory Map.
 */

let kvModule: typeof import("@vercel/kv") | null = null;

async function getKV() {
  if (kvModule) return kvModule.kv;
  try {
    kvModule = await import("@vercel/kv");
    return kvModule.kv;
  } catch {
    return null;
  }
}

// Fallback in-memory store for local dev without Vercel KV
const memStore = new Map<string, string>();

export async function kvGet<T = unknown>(key: string): Promise<T | null> {
  const kv = await getKV();
  if (kv) return kv.get<T>(key);
  const raw = memStore.get(key);
  return raw ? (JSON.parse(raw) as T) : null;
}

export async function kvSet(key: string, value: unknown, exSeconds?: number): Promise<void> {
  const kv = await getKV();
  if (kv) {
    if (exSeconds) await kv.set(key, value, { ex: exSeconds });
    else await kv.set(key, value);
  } else {
    memStore.set(key, JSON.stringify(value));
  }
}

export async function kvDel(key: string): Promise<void> {
  const kv = await getKV();
  if (kv) await kv.del(key);
  else memStore.delete(key);
}

export async function kvKeys(pattern: string): Promise<string[]> {
  const kv = await getKV();
  if (kv) {
    // @vercel/kv supports keys with pattern
    return kv.keys(pattern);
  }
  const regex = new RegExp("^" + pattern.replace(/\*/g, ".*") + "$");
  return Array.from(memStore.keys()).filter((k) => regex.test(k));
}

export async function kvLpush(key: string, ...values: unknown[]): Promise<void> {
  const kv = await getKV();
  if (kv) {
    for (const v of values) await kv.lpush(key, v);
  } else {
    const list: unknown[] = JSON.parse(memStore.get(key) || "[]");
    list.unshift(...values);
    memStore.set(key, JSON.stringify(list));
  }
}

export async function kvLrange<T = unknown>(key: string, start: number, stop: number): Promise<T[]> {
  const kv = await getKV();
  if (kv) return kv.lrange<T>(key, start, stop);
  const list: T[] = JSON.parse(memStore.get(key) || "[]");
  return list.slice(start, stop === -1 ? undefined : stop + 1);
}

export async function kvIncr(key: string, amount = 1): Promise<number> {
  const kv = await getKV();
  if (kv) return kv.incrby(key, amount);
  const val = Number(memStore.get(key) || "0") + amount;
  memStore.set(key, String(val));
  return val;
}
