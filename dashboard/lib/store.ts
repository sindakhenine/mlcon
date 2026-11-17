/**
 * Shared state for the admin switches, counters and votes. Server only.
 *
 * Uses Upstash Redis when its variables exist (added by the Vercel Marketplace:
 * KV_REST_API_URL / KV_REST_API_TOKEN, or UPSTASH_REDIS_REST_URL / _TOKEN).
 * Without them: a memory store in local development, and in production a
 * read-only "everything closed" state, so a missing database can never open the site.
 */
import { Redis } from "@upstash/redis";

export interface SiteConfig {
  siteOpen: boolean; // audience may enter with the audience code
  playOpen: boolean; // Play tabs open for the audience
  liveAI: boolean; // real Claude in Play (phase 8)
  audienceCode: string; // code shown on the slide
  callsPerVisitor: number; // live AI calls per visitor per day
  dailyCapUsd: number; // live AI spend cap per day
  poll: string; // open poll id, "" for none
  spotlight: string; // mission id phones jump to, "" for none
}

export const DEFAULT_CONFIG: SiteConfig = {
  siteOpen: false,
  playOpen: false,
  liveAI: false,
  audienceCode: "",
  callsPerVisitor: 15,
  dailyCapUsd: 30,
  poll: "",
  spotlight: "",
};

const PREFIX = "mlcon:";

// ---------------------------------------------------------------- backend
interface Backend {
  get(key: string): Promise<string | null>;
  set(key: string, value: string, ttlSeconds?: number): Promise<void>;
  incr(key: string, by?: number, ttlSeconds?: number): Promise<number>;
  hincr(key: string, field: string, by?: number): Promise<number>;
  hgetall(key: string): Promise<Record<string, number>>;
  sadd(key: string, member: string, ttlSeconds?: number): Promise<boolean>;
  zseen(key: string, member: string, now: number, windowMs: number): Promise<number>;
  zcount(key: string, now: number, windowMs: number): Promise<number>;
  lpush(key: string, value: string, keep: number, ttlSeconds: number): Promise<void>;
  lrange(key: string, n: number): Promise<string[]>;
  del(keys: string[]): Promise<void>;
}

function redisBackend(r: Redis): Backend {
  return {
    async get(k) {
      const v = await r.get<string>(PREFIX + k);
      return v === null || v === undefined ? null : typeof v === "string" ? v : JSON.stringify(v);
    },
    async set(k, v, ttl) {
      if (ttl) await r.set(PREFIX + k, v, { ex: ttl });
      else await r.set(PREFIX + k, v);
    },
    async incr(k, by = 1, ttl) {
      const n = await r.incrby(PREFIX + k, by);
      if (ttl && n === by) await r.expire(PREFIX + k, ttl);
      return n;
    },
    async hincr(k, f, by = 1) {
      return r.hincrby(PREFIX + k, f, by);
    },
    async hgetall(k) {
      const v = (await r.hgetall<Record<string, number | string>>(PREFIX + k)) ?? {};
      return Object.fromEntries(Object.entries(v).map(([a, b]) => [a, Number(b)]));
    },
    async sadd(k, m, ttl) {
      const added = await r.sadd(PREFIX + k, m);
      if (ttl) await r.expire(PREFIX + k, ttl);
      return added === 1;
    },
    async zseen(k, m, now, windowMs) {
      await r.zadd(PREFIX + k, { score: now, member: m });
      await r.zremrangebyscore(PREFIX + k, 0, now - windowMs);
      return r.zcard(PREFIX + k);
    },
    async zcount(k, now, windowMs) {
      return r.zcount(PREFIX + k, now - windowMs, "+inf");
    },
    async lpush(k, v, keep, ttl) {
      await r.lpush(PREFIX + k, v);
      await r.ltrim(PREFIX + k, 0, keep - 1);
      await r.expire(PREFIX + k, ttl);
    },
    async lrange(k, n) {
      const v = await r.lrange<string>(PREFIX + k, 0, n - 1);
      return v.map((x) => (typeof x === "string" ? x : JSON.stringify(x)));
    },
    async del(keys) {
      if (keys.length) await r.del(...keys.map((k) => PREFIX + k));
    },
  };
}

/** Local development only. Lives as long as the dev server. */
function memoryBackend(): Backend {
  const g = globalThis as unknown as { __mlconMem?: Map<string, unknown> };
  const mem = (g.__mlconMem ??= new Map<string, unknown>());
  return {
    async get(k) {
      return (mem.get(k) as string) ?? null;
    },
    async set(k, v) {
      mem.set(k, v);
    },
    async incr(k, by = 1) {
      const n = Number(mem.get(k) ?? 0) + by;
      mem.set(k, n);
      return n;
    },
    async hincr(k, f, by = 1) {
      const h = (mem.get(k) as Record<string, number>) ?? {};
      h[f] = (h[f] ?? 0) + by;
      mem.set(k, h);
      return h[f];
    },
    async hgetall(k) {
      return { ...((mem.get(k) as Record<string, number>) ?? {}) };
    },
    async sadd(k, m) {
      const s = (mem.get(k) as Set<string>) ?? new Set<string>();
      const had = s.has(m);
      s.add(m);
      mem.set(k, s);
      return !had;
    },
    async zseen(k, m, now, windowMs) {
      const z = (mem.get(k) as Map<string, number>) ?? new Map<string, number>();
      z.set(m, now);
      for (const [x, t] of z) if (t < now - windowMs) z.delete(x);
      mem.set(k, z);
      return z.size;
    },
    async zcount(k, now, windowMs) {
      const z = (mem.get(k) as Map<string, number>) ?? new Map<string, number>();
      return [...z.values()].filter((t) => t >= now - windowMs).length;
    },
    async lpush(k, v, keep) {
      const l = ((mem.get(k) as string[]) ?? []).slice();
      l.unshift(v);
      mem.set(k, l.slice(0, keep));
    },
    async lrange(k, n) {
      return ((mem.get(k) as string[]) ?? []).slice(0, n);
    },
    async del(keys) {
      for (const k of keys) mem.delete(k);
    },
  };
}

function connect(): Backend | null {
  const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
  if (url && token) return redisBackend(new Redis({ url, token }));
  if (process.env.NODE_ENV === "development") return memoryBackend();
  return null;
}

let backend: Backend | null | undefined;
export function store(): Backend | null {
  if (backend === undefined) backend = connect();
  return backend;
}

export function storeStatus(): "redis" | "memory" | "none" {
  const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
  if (url) return "redis";
  return process.env.NODE_ENV === "development" ? "memory" : "none";
}

// ---------------------------------------------------------------- config
let cache: { at: number; cfg: SiteConfig } | null = null;

/** Current switches. Cached for 3 seconds per server instance. Errors mean "closed". */
export async function getConfig(fresh = false): Promise<SiteConfig> {
  if (!fresh && cache && Date.now() - cache.at < 3000) return cache.cfg;
  const s = store();
  let cfg = { ...DEFAULT_CONFIG };
  if (s) {
    try {
      const raw = await s.get("config");
      if (raw) cfg = { ...DEFAULT_CONFIG, ...JSON.parse(raw) };
    } catch {
      cfg = { ...DEFAULT_CONFIG };
    }
  }
  cache = { at: Date.now(), cfg };
  return cfg;
}

export async function setConfig(patch: Partial<SiteConfig>): Promise<SiteConfig> {
  const s = store();
  if (!s) throw new Error("No database connected");
  const next = { ...(await getConfig(true)), ...patch };
  await s.set("config", JSON.stringify(next));
  cache = { at: Date.now(), cfg: next };
  return next;
}
