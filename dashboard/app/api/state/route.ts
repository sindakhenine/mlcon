import type { NextRequest } from "next/server";
import { json, roleHeader, visitorId, withVid } from "@/lib/http";
import { getConfig } from "@/lib/store";
import { seen } from "@/lib/stats";

/** What a visitor's page needs to know, polled every few seconds by Play. Also counts who is here. */
export async function GET(request: NextRequest) {
  const role = roleHeader(request);
  const cfg = await getConfig();
  const { vid, isNew } = visitorId(request);
  await seen(vid).catch(() => undefined);
  return withVid(
    json({ role, playOpen: cfg.playOpen, liveAI: cfg.liveAI, poll: cfg.poll, spotlight: cfg.spotlight }),
    vid,
    isNew,
  );
}
