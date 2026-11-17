"use client";

import { useSyncExternalStore } from "react";

function subscribe(cb: () => void) {
  window.addEventListener("popstate", cb);
  return () => window.removeEventListener("popstate", cb);
}

/** The page's query string, read without a server round trip (pages stay static and work offline).
 *  Empty during the server render, real value right after hydration. */
export function useSearch(): URLSearchParams {
  const s = useSyncExternalStore(
    subscribe,
    () => window.location.search,
    () => "",
  );
  return new URLSearchParams(s);
}

/** Change query parameters without reloading or adding history entries. */
export function setSearch(params: Record<string, string | null>) {
  const u = new URL(window.location.href);
  for (const [k, v] of Object.entries(params)) {
    if (v === null) u.searchParams.delete(k);
    else u.searchParams.set(k, v);
  }
  window.history.replaceState(null, "", u.pathname + u.search);
}
