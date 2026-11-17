/**
 * Live Claude in Play (PLAN.md 11). Server only. The API key never leaves the server.
 *
 * A live run is allowed only when ALL of these hold:
 *  1. the visitor passed the site lock (owner or audience),
 *  2. ANTHROPIC_API_KEY is set (Vercel secret),
 *  3. "Live AI" is on in the admin page (only Sinda can switch it),
 *  4. today's spend is under the daily cap (reaching it switches Live AI off),
 *  5. the visitor is under their runs-per-day limit.
 */
import Anthropic from "@anthropic-ai/sdk";
import type { NextRequest } from "next/server";
import { roleHeader, visitorId } from "./http";
import { getConfig, setConfig, store } from "./store";

export const MODEL = process.env.CLAUDE_MODEL?.trim() || "claude-opus-5-5";

/** USD per million tokens (from the claude-api skill, 2026-11). Haiku cache read is an estimate. */
const PRICES: Record<string, { input: number; output: number; cacheRead: number }> = {
  "claude-opus-5-5": { input: 4, output: 20, cacheRead: 0.2 },
  "claude-sonnet-5-5": { input: 2, output: 10, cacheRead: 0.1 },
  "claude-haiku-5-5": { input: 0.1, output: 0.5, cacheRead: 0.01 },
};

/** Server-side refusal fallback is available on these models (not on Haiku 5.5). */
const FALLBACK_MODELS = new Set(["claude-opus-5-5", "claude-sonnet-5-5", "claude-fable-5-2"]);

export interface Usage {
  input_tokens: number;
  output_tokens: number;
  cache_read_input_tokens?: number | null;
  cache_creation_input_tokens?: number | null;
}

export function costUsd(u: Usage, model = MODEL): number {
  const p = PRICES[model] ?? PRICES["claude-opus-5-5"];
  return (
    (u.input_tokens * p.input +
      (u.cache_creation_input_tokens ?? 0) * p.input * 1.25 +
      (u.cache_read_input_tokens ?? 0) * p.cacheRead +
      u.output_tokens * p.output) /
    1_000_000
  );
}

export function addUsage(a: Usage, b: Usage): Usage {
  return {
    input_tokens: a.input_tokens + b.input_tokens,
    output_tokens: a.output_tokens + b.output_tokens,
    cache_read_input_tokens: (a.cache_read_input_tokens ?? 0) + (b.cache_read_input_tokens ?? 0),
    cache_creation_input_tokens: (a.cache_creation_input_tokens ?? 0) + (b.cache_creation_input_tokens ?? 0),
  };
}

export const ZERO_USAGE: Usage = { input_tokens: 0, output_tokens: 0, cache_read_input_tokens: 0, cache_creation_input_tokens: 0 };

let client: Anthropic | null = null;
export function anthropic(): Anthropic {
  client ??= new Anthropic(); // reads ANTHROPIC_API_KEY from the environment
  return client;
}

/** Extra request fields: low effort for speed, and the refusal fallback where the model supports it. */
export function requestExtras() {
  return {
    output_config: { effort: "low" as const },
    ...(FALLBACK_MODELS.has(MODEL) ? { betas: ["server-side-fallback-2026-07-01"], fallbacks: "default" as const } : {}),
  };
}

const today = () => new Date().toISOString().slice(0, 10);
const MICRO = 1_000_000;

export type Guard =
  | { ok: true; vid: string; isNew: boolean; role: "owner" | "audience" }
  | { ok: false; status: number; reason: string };

export async function liveGuard(req: NextRequest): Promise<Guard> {
  const role = roleHeader(req);
  if (!role) return { ok: false, status: 401, reason: "locked" };
  if (!process.env.ANTHROPIC_API_KEY) return { ok: false, status: 503, reason: "No API key is set on the server yet." };
  const s = store();
  if (!s) return { ok: false, status: 503, reason: "No database connected." };
  const cfg = await getConfig(true);
  if (!cfg.liveAI) return { ok: false, status: 403, reason: "Live AI is switched off." };

  const spent = Number((await s.get(`ai:cost:${today()}`)) ?? 0) / MICRO;
  if (spent >= cfg.dailyCapUsd) {
    await setConfig({ liveAI: false });
    return { ok: false, status: 403, reason: "Today's spend cap is reached. Live AI switched itself off." };
  }

  const { vid, isNew } = visitorId(req);
  const limit = role === "owner" ? Math.max(cfg.callsPerVisitor, 200) : cfg.callsPerVisitor;
  const runs = await s.incr(`ai:runs:${today()}:${vid}`, 1, 2 * 86400);
  if (runs > limit) return { ok: false, status: 429, reason: `You used your ${limit} live runs for today. The simulated model still works.` };
  await s.incr(`ai:runs:${today()}`, 1, 7 * 86400);
  return { ok: true, vid, isNew, role };
}

/** Adds the run's cost to today's total. Crossing the cap switches Live AI off at once. */
export async function recordSpend(usd: number) {
  const s = store();
  if (!s || usd <= 0) return;
  const total = (await s.incr(`ai:cost:${today()}`, Math.round(usd * MICRO), 7 * 86400)) / MICRO;
  const cfg = await getConfig(true);
  if (total >= cfg.dailyCapUsd && cfg.liveAI) await setConfig({ liveAI: false });
}

export async function readAiToday(): Promise<{ usd: number; runs: number; model: string; keySet: boolean }> {
  const s = store();
  const usd = s ? Number((await s.get(`ai:cost:${today()}`)) ?? 0) / MICRO : 0;
  const runs = s ? Number((await s.get(`ai:runs:${today()}`)) ?? 0) : 0;
  return { usd, runs, model: MODEL, keySet: Boolean(process.env.ANTHROPIC_API_KEY) };
}

/** Streams newline-delimited JSON events to the browser. */
export function ndjsonStream(run: (send: (event: Record<string, unknown>) => void) => Promise<void>): ReadableStream<Uint8Array> {
  const enc = new TextEncoder();
  return new ReadableStream({
    async start(controller) {
      const send = (e: Record<string, unknown>) => controller.enqueue(enc.encode(JSON.stringify(e) + "\n"));
      try {
        await run(send);
      } catch (err) {
        send({ type: "error", message: friendlyError(err) });
      } finally {
        controller.close();
      }
    },
  });
}

export function friendlyError(err: unknown): string {
  if (err instanceof Anthropic.AuthenticationError) return "The API key was refused. Check ANTHROPIC_API_KEY in Vercel.";
  if (err instanceof Anthropic.RateLimitError) return "Too many requests to the model right now. Try again in a minute.";
  if (err instanceof Anthropic.BadRequestError) return `The model API rejected the request: ${err.message}`;
  if (err instanceof Anthropic.APIError) return `Model API error ${err.status ?? ""}. Try again.`;
  return "Something went wrong. The simulated model still works.";
}
