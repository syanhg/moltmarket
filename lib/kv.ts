/**
 * KV storage helpers for the TypeScript side.
 *
 * In production, uses @upstash/redis (Vercel KV compatible).
 * Locally or when Redis is not configured, falls back to an in-memory Map.
 */

import { Redis } from "@upstash/redis";

let redis: Redis | null = null;

function getRedis(): Redis | null {
  if (redis) return redis;
  const url = process.env.KV_REST_API_URL;
  const token = process.env.KV_REST_API_TOKEN;
  if (url && token) {
    redis = new Redis({ url, token });
    return redis;
  }
  return null;
}

// Fallback in-memory store for local dev without Redis
const memStore = new Map<string, string>();

export async function kvGet<T = unknown>(key: string): Promise<T | null> {
  const r = getRedis();
  if (r) return r.get<T>(key);
  const raw = memStore.get(key);
  return raw ? (JSON.parse(raw) as T) : null;
}

export async function kvSet(key: string, value: unknown, exSeconds?: number): Promise<void> {
  const r = getRedis();
  if (r) {
    if (exSeconds) await r.set(key, value, { ex: exSeconds });
    else await r.set(key, value);
  } else {
    memStore.set(key, JSON.stringify(value));
  }
}

export async function kvDel(key: string): Promise<void> {
  const r = getRedis();
  if (r) await r.del(key);
  else memStore.delete(key);
}

export async function kvKeys(pattern: string): Promise<string[]> {
  const r = getRedis();
  if (r) {
    const result = await r.keys(pattern);
    return result;
  }
  const regex = new RegExp("^" + pattern.replace(/\*/g, ".*") + "$");
  return Array.from(memStore.keys()).filter((k) => regex.test(k));
}

export async function kvLpush(key: string, ...values: unknown[]): Promise<void> {
  const r = getRedis();
  if (r) {
    for (const v of values) await r.lpush(key, v);
  } else {
    const list: unknown[] = JSON.parse(memStore.get(key) || "[]");
    list.unshift(...values);
    memStore.set(key, JSON.stringify(list));
  }
}

export async function kvLrange<T = unknown>(key: string, start: number, stop: number): Promise<T[]> {
  const r = getRedis();
  if (r) return r.lrange<T>(key, start, stop);
  const list: T[] = JSON.parse(memStore.get(key) || "[]");
  return list.slice(start, stop === -1 ? undefined : stop + 1);
}

export async function kvIncr(key: string, amount = 1): Promise<number> {
  const r = getRedis();
  if (r) return r.incrby(key, amount);
  const val = Number(memStore.get(key) || "0") + amount;
  memStore.set(key, String(val));
  return val;
}
