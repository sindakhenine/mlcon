"use client";

import { useState } from "react";
import { traceBroken, traceFixed } from "@/lib/s1/trace";
import { setSearch, useSearch } from "@/lib/useSearch";
import { S1Story } from "./S1Story";
import { S1Problems } from "./S1Problems";
import { S1Compare } from "./S1Compare";
import { S1Lab } from "./S1Lab";
import { PlayArea } from "../play/PlayArea";

const VIEWS = [
  { id: "broken", label: "Broken run" },
  { id: "problems", label: "Four problems" },
  { id: "fixed", label: "Fixed run" },
  { id: "compare", label: "Compare" },
  { id: "play", label: "Play" },
] as const;
type View = (typeof VIEWS)[number]["id"];

const BROKEN_IDS = traceBroken().map((s) => s.id);
const FIXED_IDS = traceFixed().map((s) => s.id);

function stepIndex(view: View, stepId: string | null): number {
  if (!stepId) return 0;
  const ids = view === "broken" ? BROKEN_IDS : view === "fixed" ? FIXED_IDS : [];
  return Math.max(0, ids.indexOf(stepId));
}

/**
 * Session 1 as one continuous clicker flow:
 * broken run → four problems → fixed run → compare.
 * "Next" on the last step of a screen opens the next screen; "back" on the first step goes back.
 * Deep link: /s1?view=fixed&step=F4
 */
export function S1Page() {
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
      <nav aria-label="Session 1 screens" className="flex flex-wrap gap-2">
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
        <S1Story key={key} run="broken" initial={initial} nextView={nextOf("Four problems", "problems")} />
      )}
      {view === "problems" && (
        <S1Problems
          key={key}
          initial={initial}
          onPrevView={back}
          nextView={nextOf("Fixed run", "fixed")}
          onJump={(stepId) => go("broken", stepIndex("broken", stepId))}
        />
      )}
      {view === "fixed" && (
        <S1Story key={key} run="fixed" initial={initial} onPrevView={back} nextView={nextOf("Compare", "compare")} />
      )}
      {view === "compare" && (
        <S1Compare
          key={key}
          initial={initial}
          onPrevView={back}
          nextView={nextOf("Play", "play")}
          onJump={(run, stepId) => go(run, stepIndex(run, stepId))}
        />
      )}
      {view === "play" && <PlayArea session="s1">{(ctx) => <S1Lab key={key} spotlight={ctx.spotlight} liveAI={ctx.liveAI} />}</PlayArea>}
    </div>
  );
}
