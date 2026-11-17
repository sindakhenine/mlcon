"use client";

import { useEffect, useState } from "react";

export interface SiteState {
  role: "owner" | "audience" | null;
  playOpen: boolean;
  liveAI: boolean;
  poll: string;
  spotlight: string;
}

/**
 * Polls the admin switches every 8 seconds while mounted (a vote or "Play open"
 * reaches phones within 8 s). Counts the visitor at most once a minute.
 * Null until the first answer.
 */
export function useSiteState(): SiteState | null {
  const [s, setS] = useState<SiteState | null>(null);
  useEffect(() => {
    let alive = true;
    let lastSeen = 0;
    const load = async () => {
      try {
        const count = Date.now() - lastSeen > 60_000;
        const r = await fetch(count ? "/api/state?seen=1" : "/api/state", { cache: "no-store" });
        if (count) lastSeen = Date.now();
        if (r.ok && alive) setS(await r.json());
      } catch {
        // offline: keep the last known state
      }
    };
    const first = setTimeout(load, 0);
    const t = setInterval(load, 8000);
    return () => {
      alive = false;
      clearTimeout(first);
      clearInterval(t);
    };
  }, []);
  return s;
}

/** Anonymous counters. Fire and forget: never blocks or breaks the page. */
export function track(body: Record<string, unknown>) {
  try {
    void fetch("/api/track", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
      keepalive: true,
    }).catch(() => undefined);
  } catch {
    // ignore
  }
}
