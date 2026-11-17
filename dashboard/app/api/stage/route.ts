import type { NextRequest } from "next/server";
import { isAdmin, json, roleHeader } from "@/lib/http";
import { getConfig } from "@/lib/store";
import { readStats } from "@/lib/stats";

/** Numbers for the projector page. Owner or admin only (never the audience). */
export async function GET(request: NextRequest) {
  if (roleHeader(request) !== "owner" && !isAdmin(request)) return json({ error: "not allowed" }, 403);
  const [cfg, stats] = await Promise.all([getConfig(true), readStats()]);
  return json({
    siteOpen: cfg.siteOpen,
    playOpen: cfg.playOpen,
    audienceCode: cfg.siteOpen ? cfg.audienceCode : "",
    poll: cfg.poll,
    stats,
  });
}
