"use client";

import { useState } from "react";
import { traceBroken, traceGated } from "@/lib/s2/trace";
import { setSearch, useSearch } from "@/lib/useSearch";
import { S2Story } from "./S2Story";
import { S2Failures } from "./S2Failures";
import { S2Path } from "./S2Path";
import { S2Lab } from "./S2Lab";

const VIEWS = [
  { id: "broken", label: "Broken run" },
  { id: "failures", label: "Four failures" },
  { id: "gated", label: "Through the gateway" },
  { id: "path", label: "Path check" },
  { id: "play", label: "Play" },
] as const;
type View = (typeof VIEWS)[number]["id"];

const BROKEN_IDS = traceBroken().map((s) => s.id);
const GATED_IDS = traceGated().map((s) => s.id);

function stepIndex(view: View, stepId: string | null): number {
  if (!stepId) return 0;
  const ids = view === "broken" ? BROKEN_IDS : view === "gated" ? GATED_IDS : [];
  return Math.max(0, ids.indexOf(stepId));
}

/**
 * Session 2 as one clicker flow: broken run → four failures → through the gateway → path check.
 * Deep link: /s2?view=gated&step=G3
 */
export function S2Page() {
  const q = useSearch();
  const [nav, setNav] = useState<{ view: View; initial: number; nonce: number } | null>(null);

  const urlView = (VIEWS.find((v) => v.id === q.get("view"))?.id ?? "broken") as View;
  const view = nav?.view ?? urlView;
  const initial = nav ? nav.initial : stepIndex(urlView, q.get("step"));
  const key = nav ? `${nav.view}-${nav.nonce}` : `${urlView}-url-${q.get("step") ?? ""}`;

  const go = (v: View, at = 0) => {
    setNav((n) => ({ view: v, initial: at, nonce: (n?.nonce ?? 0) + 1 }));
    setSearch({ view: v, step: null });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  const pos = VIEWS.findIndex((v) => v.id === view);
  const nextOf = (label: string, v: View) => ({ label, go: () => go(v) });
  const back = pos > 0 ? () => go(VIEWS[pos - 1].id, -1) : undefined;

  return (
    <div className="flex flex-col gap-5">
      <nav aria-label="Session 2 screens" className="flex flex-wrap gap-2">
        {VIEWS.map((v, i) => (
          <button
            key={v.id}
            onClick={() => go(v.id)}
            aria-current={v.id === view ? "page" : undefined}
            className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition ${
              v.id === view ? "border-brand bg-surface-2 text-text" : "border-line text-muted hover:text-text"
            }`}
          >
            <span className="font-mono text-xs opacity-70">{i + 1}</span>
            {v.label}
          </button>
        ))}
      </nav>

      {view === "broken" && (
        <S2Story key={key} run="broken" initial={initial} nextView={nextOf("Four failures", "failures")} />
      )}
      {view === "failures" && (
        <S2Failures
          key={key}
          initial={initial}
          onPrevView={back}
          nextView={nextOf("Through the gateway", "gated")}
          onJump={(stepId) => go("broken", stepIndex("broken", stepId))}
        />
      )}
      {view === "gated" && (
        <S2Story key={key} run="gated" initial={initial} onPrevView={back} nextView={nextOf("Path check", "path")} />
      )}
      {view === "path" && <S2Path key={key} initial={initial} onPrevView={back} nextView={nextOf("Play", "play")} />}
      {view === "play" && <S2Lab key={key} />}
    </div>
  );
}
