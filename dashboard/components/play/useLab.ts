"use client";

import { useMemo, useState } from "react";
import type { Mission } from "@/lib/s1/lab";
import { track } from "@/lib/useSiteState";

function load(key: string): string[] {
  try {
    const raw = window.localStorage.getItem(key);
    const v = raw ? JSON.parse(raw) : [];
    return Array.isArray(v) ? v.filter((x) => typeof x === "string") : [];
  } catch {
    return [];
  }
}

function save(key: string, ids: string[]) {
  try {
    window.localStorage.setItem(key, JSON.stringify(ids));
  } catch {
    // private mode or storage blocked: missions still work for this visit
  }
}

/**
 * State for a Play lab: the input, the computed output, and the missions solved
 * (remembered in this browser only). Rendered only after hydration, so reading
 * localStorage in the initializer is safe.
 */
export function useLab<I, O>(storageKey: string, initial: () => I, run: (i: I) => O, missions: Mission<I, O>[]) {
  const [input, setInput] = useState<I>(initial);
  const [solved, setSolved] = useState<string[]>(() => load(storageKey));
  const output = useMemo(() => run(input), [input, run]);
  const [justSolved, setJustSolved] = useState<string | null>(null);

  const update = (fn: (prev: I) => I) => {
    const next = fn(input);
    setInput(next);
    const out = run(next);
    const fresh = missions.filter((m) => !solved.includes(m.id) && m.done(next, out)).map((m) => m.id);
    if (fresh.length) {
      const all = [...solved, ...fresh];
      setSolved(all);
      save(storageKey, all);
      setJustSolved(fresh[0]);
      for (const id of fresh) track({ type: "mission", id }); // anonymous counter for the stage screen
    }
  };

  const resetMissions = () => {
    setSolved([]);
    save(storageKey, []);
    setJustSolved(null);
  };

  return { input, output, update, setInput, solved, justSolved, clearJustSolved: () => setJustSolved(null), resetMissions };
}
