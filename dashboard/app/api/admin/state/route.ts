import type { NextRequest } from "next/server";
import { randomInt } from "node:crypto";
import { adminConfigured, gateConfigured } from "@/lib/gate";
import { isAdmin, json } from "@/lib/http";
import { DEFAULT_CONFIG, getConfig, setConfig, storeStatus, type SiteConfig } from "@/lib/store";
import { readAttacks, readStats, resetStats } from "@/lib/stats";
import { POLLS } from "@/lib/polls";
import { S1_MISSIONS } from "@/lib/s1/lab";
import { S2_MISSIONS } from "@/lib/s2/lab";

const WORDS = ["berlin", "context", "gateway", "budget", "refresh", "secure", "manifest", "agent", "audit", "bound"];

/** Short code people can type from a slide, e.g. "gateway-42". */
function newAudienceCode() {
  return `${WORDS[randomInt(WORDS.length)]}-${randomInt(10, 100)}`;
}

export async function GET(request: NextRequest) {
  if (!isAdmin(request)) return json({ error: "admin login needed" }, 401);
  const [config, stats, attacks] = await Promise.all([getConfig(true), readStats(), readAttacks()]);
  return json({
    config,
    stats,
    attacks,
    setup: { database: storeStatus(), ownerCode: gateConfigured(), adminPassword: adminConfigured() },
    polls: POLLS,
    missions: [...S1_MISSIONS, ...S2_MISSIONS].map((m) => ({ id: m.id, title: m.title })),
  });
}

/** Change switches. Body: a partial config, or { action: "kill" | "reset" | "rotate" }. */
export async function POST(request: NextRequest) {
  if (!isAdmin(request)) return json({ error: "admin login needed" }, 401);
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return json({ error: "bad request" }, 400);
  }
  try {
    if (body.action === "kill") return json({ config: await setConfig({ playOpen: false, liveAI: false, poll: "", spotlight: "" }) });
    if (body.action === "reset") {
      await resetStats();
      return json({ config: await getConfig(true) });
    }
    if (body.action === "rotate") return json({ config: await setConfig({ audienceCode: newAudienceCode() }) });

    const patch: Partial<SiteConfig> = {};
    for (const k of ["siteOpen", "playOpen", "liveAI"] as const) if (typeof body[k] === "boolean") patch[k] = body[k] as boolean;
    if (typeof body.audienceCode === "string") patch.audienceCode = body.audienceCode.trim().slice(0, 40);
    if (typeof body.callsPerVisitor === "number")
      patch.callsPerVisitor = Math.max(0, Math.min(200, Math.round(body.callsPerVisitor)));
    if (typeof body.dailyCapUsd === "number") patch.dailyCapUsd = Math.max(0, Math.min(1000, body.dailyCapUsd));
    if (typeof body.poll === "string") patch.poll = POLLS.some((p) => p.id === body.poll) ? body.poll : "";
    if (typeof body.spotlight === "string")
      patch.spotlight = [...S1_MISSIONS, ...S2_MISSIONS].some((m) => m.id === body.spotlight) ? body.spotlight : "";
    // Opening the site without an audience code would open it to nobody; make one.
    const current = await getConfig(true);
    if (patch.siteOpen && !(patch.audienceCode ?? current.audienceCode)) patch.audienceCode = newAudienceCode();
    return json({ config: await setConfig({ ...DEFAULT_CONFIG, ...current, ...patch }) });
  } catch (e) {
    return json({ error: (e as Error).message }, 503);
  }
}
