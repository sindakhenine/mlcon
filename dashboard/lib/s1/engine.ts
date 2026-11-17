/**
 * Session 1: the context layer. TypeScript port of companion-code/context_layer.py.
 * Pure functions: no network, no UI. The Python file is the source of truth;
 * tests/golden.test.ts checks that both give the same results.
 */

export type Status = "current" | "superseded" | "draft";
export type Trust = "system" | "verified" | "user" | "external";

export interface ContextElement {
  id: string;
  text: string;
  source: string; // system of record: "policy_cms", "crm", "price_api"
  version: string;
  updatedAt: string; // ISO date
  status: Status;
  acl: string[]; // groups allowed to see it
  trust: Trust;
  contentHash: string; // duplicate detection
  score: number; // similarity from retrieval
  tokens: number;
}

/** Same rule as Python __post_init__: about 4 characters per token. */
export function element(
  e: Omit<ContextElement, "score" | "tokens"> & { score?: number; tokens?: number },
): ContextElement {
  return {
    ...e,
    score: e.score ?? 0,
    tokens: e.tokens || Math.max(1, Math.floor(e.text.length / 4)),
  };
}

const MIN = 60_000;
const HOUR = 60 * MIN;
const DAY = 24 * HOUR;

/** How long each kind of source stays valid (Pattern 4: freshness). */
export const TTL: Record<string, number> = {
  price_api: 15 * MIN,
  crm: HOUR,
  policy_cms: 30 * DAY,
};

export interface Manifest {
  request_id: string;
  user: string;
  groups: string[];
  query: string;
  admitted: {
    id: string;
    version: string;
    source: string;
    score: number;
    tokens: number;
    trust: Trust;
  }[];
  rejected: { id: string; reason: string }[];
}

export function newManifest(requestId: string, user: string, groups: string[], query: string): Manifest {
  return { request_id: requestId, user, groups: [...groups].sort(), query, admitted: [], rejected: [] };
}

function reject(m: Manifest, el: ContextElement, reason: string) {
  m.rejected.push({ id: el.id, reason });
}

function admit(m: Manifest, el: ContextElement) {
  m.admitted.push({
    id: el.id,
    version: el.version,
    source: el.source,
    score: el.score,
    tokens: el.tokens,
    trust: el.trust,
  });
}

/** Stable sort by score, highest first (same as Python sorted(..., reverse=True)). */
function byScoreDesc<T extends { score: number }>(items: T[]): T[] {
  return [...items].sort((a, b) => b.score - a.score);
}

/** Pattern 3: permissions are a filter BEFORE ranking, not after. */
export function retrieve(
  index: ContextElement[],
  scores: Record<string, number>,
  groups: string[],
  k = 4,
): ContextElement[] {
  const allowed = index
    .filter((e) => e.acl.some((g) => groups.includes(g)))
    .map((e) => ({ ...e, score: scores[e.id] ?? 0 }));
  return byScoreDesc(allowed).slice(0, k);
}

/** Pattern 4: freshness is an invalidation rule. Returns the reason, or null if fresh. */
export function isFresh(el: ContextElement, now: Date): string | null {
  if (el.status !== "current") return `status=${el.status}`;
  const age = now.getTime() - new Date(el.updatedAt).getTime();
  if (age > (TTL[el.source] ?? DAY)) return "ttl_expired";
  return null;
}

/** Pattern 5: the window is a budget; every eviction is logged. */
export const BUDGET: Record<string, number> = {
  system: 1500,
  tools: 1000,
  retrieved: 8000,
  memory: 600,
  history: 1200,
};

export function fitBudget(
  elements: ContextElement[],
  section: string,
  m: Manifest,
  budget: Record<string, number> = BUDGET,
): ContextElement[] {
  const keep: ContextElement[] = [];
  const seen = new Set<string>();
  let used = 0;
  for (const el of elements) {
    if (seen.has(el.contentHash)) {
      reject(m, el, "duplicate");
      continue;
    }
    if (used + el.tokens > budget[section]) {
      reject(m, el, `budget:${section}`);
      continue;
    }
    seen.add(el.contentHash);
    keep.push(el);
    used += el.tokens;
  }
  return keep;
}

/** Pattern 7: tool results are untrusted input; validate in code.
 *  Python type names are kept in the messages so both versions print the same text. */
const ORDER_SCHEMA: Record<string, "str" | "float"> = {
  order_id: "str",
  purchased_on: "str",
  amount_eur: "float",
};

export function validateToolResult(payload: Record<string, unknown>): Record<string, unknown> {
  for (const [key, typ] of Object.entries(ORDER_SCHEMA)) {
    const v = payload[key];
    const ok = typ === "str" ? typeof v === "string" : typeof v === "number" && Number.isFinite(v);
    if (!ok) throw new Error(`tool result rejected: ${key} missing or not ${typ}`);
  }
  const amount = payload.amount_eur as number;
  if (!(amount > 0 && amount < 10_000)) throw new Error("tool result rejected: amount_eur out of bounds");
  return payload;
}

/** The whole fixed read path: Secure, Refresh, Budget, Observe. */
export function buildContext(
  index: ContextElement[],
  scores: Record<string, number>,
  user: string,
  groups: string[],
  query: string,
  now: Date,
  requestId = "req-1",
): { admitted: ContextElement[]; manifest: Manifest; candidates: ContextElement[]; fresh: ContextElement[] } {
  const m = newManifest(requestId, user, groups, query);
  const candidates = retrieve(index, scores, groups, 6);
  const fresh: ContextElement[] = [];
  for (const el of candidates) {
    const why = isFresh(el, now);
    if (why) reject(m, el, why);
    else fresh.push(el);
  }
  const admitted = fitBudget(fresh, "retrieved", m);
  for (const el of admitted) admit(m, el);
  return { admitted, manifest: m, candidates, fresh };
}

/** What most demos ship: rank everything, glue strings, cut at N characters. */
export function buildContextNaive(
  index: ContextElement[],
  scores: Record<string, number>,
  k = 4,
  maxChars = 160,
): { context: string; joined: string; ranked: ContextElement[] } {
  const ranked = byScoreDesc(index.map((e) => ({ ...e, score: scores[e.id] ?? 0 }))).slice(0, k);
  const joined = ranked.map((e) => e.text).join("\n");
  return { context: joined.slice(0, maxChars), joined, ranked };
}
