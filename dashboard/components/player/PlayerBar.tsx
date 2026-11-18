"use client";

import { ChevronLeft, ChevronRight, Pause, Play, RotateCcw } from "lucide-react";
import type { PlayerState } from "./usePlayer";
import type { Step } from "@/lib/trace";
import { CueCard } from "../stage/StageTools";

const SPEEDS = [0.5, 1, 2];

/** Controls under a story: back, play, next, one dot per step, speed. */
export function PlayerBar({
  player,
  steps,
  tone,
  nextView,
}: {
  player: PlayerState;
  steps: Pick<Step, "id" | "title">[];
  tone: "bug" | "fix";
  nextView?: { label: string; go: () => void };
}) {
  const dot = tone === "bug" ? "bg-bug" : "bg-fix";
  const btn =
    "inline-flex h-10 w-10 items-center justify-center rounded-full border border-line bg-surface text-text transition hover:border-brand disabled:opacity-30";
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-line bg-surface/80 px-3 py-2 backdrop-blur">
      <CueCard id={steps[player.index]?.id ?? ""} nextId={steps[player.index + 1]?.id} />
      <button className={btn} onClick={player.restart} aria-label="Restart (R)" title="Restart (R)">
        <RotateCcw size={18} />
      </button>
      <button className={btn} onClick={player.prev} disabled={player.atStart} aria-label="Back" title="Back (←)">
        <ChevronLeft size={20} />
      </button>
      <button
        className={`${btn} h-12 w-12 border-brand`}
        onClick={player.togglePlay}
        aria-label={player.playing ? "Pause" : "Play"}
        title="Play or pause (P)"
      >
        {player.playing ? <Pause size={20} /> : <Play size={20} />}
      </button>
      {player.atEnd && nextView ? (
        <button
          onClick={nextView.go}
          className="inline-flex h-10 items-center gap-1 rounded-full border border-brand bg-surface-2 px-4 text-sm font-semibold text-text transition hover:bg-brand hover:text-bg"
          title="Next screen (→)"
        >
          Next: {nextView.label} <ChevronRight size={18} />
        </button>
      ) : (
        <button className={btn} onClick={player.next} disabled={player.atEnd} aria-label="Next" title="Next (→)">
          <ChevronRight size={20} />
        </button>
      )}

      <ol className="flex flex-1 items-center gap-1.5 px-2" aria-label="Steps">
        {steps.map((s, i) => (
          <li key={s.id} className="flex-1">
            <button
              onClick={() => player.goto(i)}
              title={`${s.id}: ${s.title}`}
              aria-label={`Go to step ${s.id}`}
              aria-current={i === player.index ? "step" : undefined}
              className={`block h-2 w-full rounded-full transition ${
                i < player.index ? dot : i === player.index ? `${dot} ring-2 ring-offset-2 ring-offset-surface ring-brand` : "bg-surface-2"
              }`}
            />
          </li>
        ))}
      </ol>

      <span className="font-mono text-sm text-muted tabular-nums">
        {player.index + 1}/{player.count}
      </span>
      <div className="flex overflow-hidden rounded-full border border-line text-xs">
        {SPEEDS.map((s) => (
          <button
            key={s}
            onClick={() => player.setSpeed(s)}
            className={`px-2.5 py-1.5 font-mono ${player.speed === s ? "bg-surface-2 text-text" : "text-muted"}`}
          >
            {s}x
          </button>
        ))}
      </div>
    </div>
  );
}
