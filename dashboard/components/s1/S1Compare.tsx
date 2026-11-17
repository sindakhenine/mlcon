"use client";

import { motion } from "framer-motion";
import { Check, X } from "lucide-react";
import { compareRows } from "@/lib/s1/compare";
import { usePlayer } from "../player/usePlayer";
import { PlayerBar } from "../player/PlayerBar";

const ROWS = compareRows();
const STEPS = [...ROWS.map((r, i) => ({ id: `C${i + 1}`, title: r.label })), { id: "C7", title: "Same model, same prompt" }];

/** Broken vs fixed, one row per click. Each cell jumps to the step that explains it. */
export function S1Compare({
  initial = 0,
  onPrevView,
  onJump,
  nextView,
}: {
  initial?: number;
  onPrevView?: () => void;
  onJump: (run: "broken" | "fixed", stepId: string) => void;
  nextView?: { label: string; go: () => void };
}) {
  const player = usePlayer(STEPS.length, { initial, onBeforeStart: onPrevView, onPastEnd: nextView?.go });
  const shown = player.index + 1;

  return (
    <div className="flex flex-col gap-4">
      <div className="overflow-hidden rounded-2xl border border-line bg-surface">
        <div className="grid grid-cols-[1fr_1fr] border-b border-line text-sm font-semibold sm:grid-cols-[minmax(160px,24%)_1fr_1fr]">
          <div className="hidden px-5 py-4 text-muted sm:block" />
          <div className="flex items-center gap-2 bg-bug-soft px-5 py-4 text-bug">
            <X size={18} /> Broken pipeline
          </div>
          <div className="flex items-center gap-2 bg-fix-soft px-5 py-4 text-fix">
            <Check size={18} /> Fixed pipeline
          </div>
        </div>
        {ROWS.map((r, i) => (
          <motion.div
            key={r.label}
            initial={false}
            animate={{ opacity: i < shown ? 1 : 0.12 }}
            transition={{ duration: 0.35 }}
            className="grid grid-cols-[1fr_1fr] border-b border-line last:border-b-0 sm:grid-cols-[minmax(160px,24%)_1fr_1fr]"
          >
            <div className="col-span-2 px-5 pt-4 text-sm font-medium text-muted sm:col-span-1 sm:py-4 sm:text-base">{r.label}</div>
            <Cell text={r.broken} tone="bug" step={r.brokenStep} onJump={(s) => onJump("broken", s)} active={i === player.index} />
            <Cell text={r.fixed} tone="fix" step={r.fixedStep} onJump={(s) => onJump("fixed", s)} active={i === player.index} />
          </motion.div>
        ))}
      </div>

      <motion.p
        initial={false}
        animate={{ opacity: player.index >= ROWS.length ? 1 : 0, y: player.index >= ROWS.length ? 0 : 8 }}
        className="rounded-2xl border border-brand bg-surface-2 px-6 py-5 text-center text-xl font-semibold sm:text-2xl"
      >
        Same model. Same prompt. Only the context changed.
      </motion.p>

      <PlayerBar player={player} steps={STEPS} tone="fix" nextView={nextView} />
    </div>
  );
}

function Cell({
  text,
  tone,
  step,
  onJump,
  active,
}: {
  text: string;
  tone: "bug" | "fix";
  step: string | null;
  onJump: (s: string) => void;
  active: boolean;
}) {
  return (
    <div className={`flex flex-col gap-1 px-5 py-4 ${active ? (tone === "bug" ? "bg-bug-soft" : "bg-fix-soft") : ""}`}>
      <span className={`text-base font-semibold sm:text-lg ${tone === "bug" ? "text-bug" : "text-fix"}`}>{text}</span>
      {step && (
        <button onClick={() => onJump(step)} className="self-start font-mono text-xs text-muted hover:text-brand hover:underline">
          why? see {step}
        </button>
      )}
    </div>
  );
}
