import type { NextRequest } from "next/server";
import { json, visitorId, withVid } from "@/lib/http";
import { trackAttack, trackMission, vote } from "@/lib/stats";
import { getConfig } from "@/lib/store";

/**
 * Anonymous counters from Play: { type: "mission", id } | { type: "attack", ticket, paid, allOn }
 * | { type: "vote", poll, option }. Best effort: errors never break the page.
 */
export async function POST(request: NextRequest) {
  const { vid, isNew } = visitorId(request);
  let b: Record<string, unknown>;
  try {
    b = await request.json();
  } catch {
    return json({ ok: false }, 400);
  }
  try {
    if (b.type === "mission" && typeof b.id === "string") await trackMission(vid, b.id);
    else if (b.type === "attack" && typeof b.ticket === "string" && typeof b.paid === "number")
      await trackAttack(vid, b.ticket, Math.max(0, b.paid), b.allOn === true);
    else if (b.type === "vote" && typeof b.poll === "string" && typeof b.option === "string") {
      const cfg = await getConfig();
      if (cfg.poll !== b.poll) return withVid(json({ ok: false, reason: "poll closed" }), vid, isNew);
      const ok = await vote(vid, b.poll, b.option);
      return withVid(json({ ok }), vid, isNew);
    }
  } catch {
    // counting must never break the page
  }
  return withVid(json({ ok: true }), vid, isNew);
}
