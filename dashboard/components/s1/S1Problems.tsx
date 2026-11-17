"use client";

import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { buildContextNaive } from "@/lib/s1/engine";
import { INDEX, SCORES } from "@/lib/s1/fixtures";
import { PROBLEMS } from "@/lib/s1/trace";
import { usePlayer } from "../player/usePlayer";
import { PlayerBar } from "../player/PlayerBar";
import { ProblemBadge } from "../story/ProblemBadge";

/** Which document each problem points at, for the evidence table. */
const DOC_OF: Record<number, string> = {
  1: "refund_policy_v1",
  2: "refund_policy_v1_scan",
  3: "goodwill_guidelines",
  4: "refund_policy_v2",
};

const STEPS = [
  ...PROBLEMS.map((p) => ({ id: `P${p.n}`, title: p.title })),
  { id: "P5", title: "None of them is in the prompt" },
];

/**
 * The answer to the exercise: four problems, revealed one per click,
 * each pointing at its document and at the step where it was created.
 */
export function S1Problems({
  initial = 0,
  nextView,
  onPrevView,
  onJump,
}: {
  initial?: number;
  nextView?: { label: string; go: () => void };
  onPrevView?: () => void;
  onJump: (stepId: string) => void;
}) {
  const player = usePlayer(STEPS.length, { initial, onPastEnd: nextView?.go, onBeforeStart: onPrevView });
  const shown = Math.min(player.index + 1, PROBLEMS.length);
  const current = player.index < PROBLEMS.length ? PROBLEMS[player.index].n : null;
  const ranked = buildContextNaive(INDEX, SCORES).ranked;

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-4 xl:grid-cols-[minmax(340px,38%)_1fr]">
        {/* evidence: the list the AI received */}
        <section className="rounded-2xl border border-line bg-surface p-5">
          <h3 className="text-lg font-semibold">What the AI received</h3>
          <p className="mt-1 text-sm text-muted">Same four documents as in the broken run, in the order it ranked them.</p>
          <table className="mt-4 w-full font-mono text-[13px]">
            <thead>
              <tr className="text-left text-[11px] uppercase tracking-wider text-muted">
                <th className="pb-2 font-medium">document</th>
                <th className="pb-2 font-medium">score</th>
                <th className="pb-2 font-medium">status</th>
                <th className="pb-2 font-medium">acl</th>
              </tr>
            </thead>
            <tbody>
              {ranked.map((d) => {
                const n = Number(Object.keys(DOC_OF).find((k) => DOC_OF[Number(k)] === d.id));
                const revealed = n <= shown;
                const isCurrent = n === current;
                return (
                  <tr
                    key={d.id}
                    className={`border-t border-line transition-colors ${isCurrent ? "bg-bug-soft" : ""}`}
                  >
                    <td className="py-2.5 pr-2">
                      <span className="flex items-center gap-2">
                        {revealed ? <ProblemBadge n={n} size="sm" /> : <span className="h-5 w-5" />}
                        <span className={isCurrent ? "font-semibold text-bug" : ""}>{d.id}</span>
                      </span>
                    </td>
                    <td className="py-2.5 tabular-nums">{d.score.toFixed(2)}</td>
                    <td className={`py-2.5 ${d.status === "current" ? "text-fix" : "text-bug"}`}>{d.status}</td>
                    <td className={`py-2.5 ${d.acl.includes("public") ? "text-muted" : "text-warn"}`}>{d.acl.join(", ")}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </section>

        {/* the four problems */}
        <section className="grid content-start gap-4 sm:grid-cols-2">
          {PROBLEMS.map((p, i) => (
            <div key={p.n} className="relative min-h-[178px]">
              <div className="absolute inset-0 rounded-2xl border-2 border-dashed border-line" aria-hidden />
              <AnimatePresence>
                {i < shown && (
                  <motion.article
                    initial={{ opacity: 0, y: 18, scale: 0.97 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.97 }}
                    transition={{ type: "spring", stiffness: 260, damping: 24 }}
                    className={`relative flex h-full flex-col rounded-2xl border-2 bg-surface p-5 ${
                      p.n === current ? "border-bug shadow-[0_0_32px_var(--bug-soft)]" : "border-line"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <ProblemBadge n={p.n} size="lg" />
                      <h3 className="text-lg font-semibold leading-snug">{p.title}</h3>
                    </div>
                    <p className="mt-2 text-muted">{p.why}</p>
                    <div className="mt-auto flex flex-wrap items-center gap-3 pt-4">
                      <span className="rounded-md bg-fix-soft px-2 py-1 font-mono text-xs font-semibold text-fix">
                        fixed by: {p.fix}
                      </span>
                      <button
                        onClick={() => onJump(p.step)}
                        className="ml-auto inline-flex items-center gap-1 text-sm font-medium text-brand hover:underline"
                      >
                        See it happen ({p.step}) <ArrowRight size={14} />
                      </button>
                    </div>
                  </motion.article>
                )}
              </AnimatePresence>
            </div>
          ))}
        </section>
      </div>

      <AnimatePresence>
        {player.index >= PROBLEMS.length && (
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="rounded-2xl border border-brand bg-surface-2 px-6 py-5 text-center text-xl font-semibold sm:text-2xl"
          >
            None of them is in the prompt. Changing the prompt fixes nothing, because the model never saw the right
            document.
          </motion.p>
        )}
      </AnimatePresence>

      <PlayerBar player={player} steps={STEPS} tone="bug" nextView={nextView} />
    </div>
  );
}
