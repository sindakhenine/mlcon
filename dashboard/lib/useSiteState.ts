"use client";

import { useEffect, useState } from "react";

export interface SiteState {
  role: "owner" | "audience" | null;
  playOpen: boolean;
  liveAI: boolean;
  poll: string;
  spotlight: string;
}

/** Polls the admin switches every 4 seconds while mounted. Null until the first answer. */
export function useSiteState(): SiteState | null {
  const [s, setS] = useState<SiteState | null>(null);
  useEffect(() => {
    let alive = true;
    const load = async () => {
      try {
        const r = await fetch("/api/state", { cache: "no-store" });
        if (r.ok && alive) setS(await r.json());
      } catch {
        // offline: keep the last known state
      }
    };
    const first = setTimeout(load, 0);
    const t = setInterval(load, 4000);
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
