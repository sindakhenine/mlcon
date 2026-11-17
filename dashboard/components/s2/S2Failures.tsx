"use client";

import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { FAILURES, brokenPayments } from "@/lib/s2/trace";
import { USER } from "@/lib/s2/fixtures";
import { usePlayer } from "../player/usePlayer";
import { PlayerBar } from "../player/PlayerBar";
import { ProblemBadge } from "../story/ProblemBadge";

/** Which rows of the trajectory each failure points at. */
const ROWS_OF: Record<number, number[]> = { 1: [3, 4], 2: [5], 3: [5], 4: [6, 7, 8, 9, 10, 11, 12, 13, 14] };

const STEPS = [
  ...FAILURES.map((f) => ({ id: `X${f.n}`, title: f.title })),
  { id: "X5", title: "The model did what the text asked" },
];

/** The answer to the exercise: four failures, one per click, each linked to its rows and step. */
export function S2Failures({
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
  const shown = Math.min(player.index + 1, FAILURES.length);
  const current = player.index < FAILURES.length ? FAILURES[player.index].n : null;
  const rows = brokenPayments();
  const hot = current ? ROWS_OF[current] : [];

  // Steps 6 to 14 are the same call: show them as one row.
  const compact = [...rows.slice(0, 5), { ...rows[5], step: 6, label: `6 to ${rows.length}` }];

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-4 xl:grid-cols-[minmax(360px,40%)_1fr]">
        <section className="rounded-2xl border border-line bg-surface p-5">
          <h3 className="text-lg font-semibold">What the agent did</h3>
          <p className="mt-1 text-sm text-muted">Every step was allowed. Nobody checked anything.</p>
          <table className="mt-4 w-full font-mono text-[13px]">
            <thead>
              <tr className="text-left text-[11px] uppercase tracking-wider text-muted">
                <th className="pb-2 font-medium">step</th>
                <th className="pb-2 font-medium">action</th>
                <th className="pb-2 text-right font-medium">paid</th>
              </tr>
            </thead>
            <tbody>
              {compact.map((r) => {
                const isHot = "label" in r ? hot.some((h) => h >= 6) : hot.includes(r.step);
                const own = !("order_id" in r.args) || USER.orders.includes(String(r.args.order_id));
                return (
                  <tr key={r.step} className={`border-t border-line transition-colors ${isHot ? "bg-bug-soft text-bug" : ""}`}>
                    <td className="py-2.5 pr-2 text-muted">{"label" in r ? r.label : r.step}</td>
                    <td className="py-2.5 pr-2">
                      {r.tool}
                      {"order_id" in r.args && <span className={own ? "text-muted" : "text-bug"}> {String(r.args.order_id)}</span>}
                      {"label" in r && <span className="text-muted"> × {rows.length - 5}</span>}
                    </td>
                    <td className="py-2.5 text-right tabular-nums">{r.paid ? `${r.paid.toFixed(2)}` : ""}</td>
                  </tr>
                );
              })}
              <tr className="border-t-2 border-line font-semibold">
                <td className="pt-3" colSpan={2}>
                  total paid
                </td>
                <td className="pt-3 text-right text-bug tabular-nums">{rows[rows.length - 1].total.toFixed(2)} EUR</td>
              </tr>
            </tbody>
          </table>
        </section>

        <section className="grid content-start gap-4 sm:grid-cols-2">
          {FAILURES.map((f, i) => (
            <div key={f.n} className="relative min-h-[178px]">
              <div className="absolute inset-0 rounded-2xl border-2 border-dashed border-line" aria-hidden />
              <AnimatePresence>
                {i < shown && (
                  <motion.article
                    initial={{ opacity: 0, y: 18, scale: 0.97 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.97 }}
                    transition={{ type: "spring", stiffness: 260, damping: 24 }}
                    className={`relative flex h-full flex-col rounded-2xl border-2 bg-surface p-5 ${
                      f.n === current ? "border-bug shadow-[0_0_32px_var(--bug-soft)]" : "border-line"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <ProblemBadge n={f.n} size="lg" />
                      <h3 className="text-lg font-semibold leading-snug">{f.title}</h3>
                    </div>
                    <p className="mt-2 text-muted">{f.why}</p>
                    <div className="mt-auto flex flex-wrap items-center gap-3 pt-4">
                      <span className="rounded-md bg-fix-soft px-2 py-1 font-mono text-xs font-semibold text-fix">
                        fixed by: {f.fix}
                      </span>
                      <button
                        onClick={() => onJump(f.step)}
                        className="ml-auto inline-flex items-center gap-1 text-sm font-medium text-brand hover:underline"
                      >
                        See it happen ({f.step}) <ArrowRight size={14} />
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
        {player.index >= FAILURES.length && (
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="rounded-2xl border border-brand bg-surface-2 px-6 py-5 text-center text-xl font-semibold sm:text-2xl"
          >
            The model did what the text asked. A better prompt works most of the time. Money needs every time.
          </motion.p>
        )}
      </AnimatePresence>

      <PlayerBar player={player} steps={STEPS} tone="bug" nextView={nextView} />
    </div>
  );
}
