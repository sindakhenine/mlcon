"use client";

import { motion } from "framer-motion";
import { useState } from "react";
import { passHatK } from "@/lib/s2/gateway";
import { pathChecks } from "@/lib/s2/path";
import { LADDER, PROMOTION_GATE } from "@/lib/s2/fixtures";
import { usePlayer } from "../player/usePlayer";
import { PlayerBar } from "../player/PlayerBar";

const STEPS = [
  { id: "T1", title: "Grade the path, not only the answer" },
  { id: "T2", title: "pass^k: every run, not your best run" },
  { id: "T3", title: "Promote autonomy with evidence" },
];
const CHECKS = pathChecks();

/** Evaluate and promote: trajectory checks, the pass^k calculator, the autonomy ladder. */
export function S2Path({ initial = 0, onPrevView }: { initial?: number; onPrevView?: () => void }) {
  const player = usePlayer(STEPS.length, { initial, onBeforeStart: onPrevView });
  return (
    <div className="flex flex-col gap-4">
      <motion.section
        key={player.index}
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl border border-line bg-surface p-5 sm:p-6"
      >
        <div className="flex items-baseline gap-3">
          <span className="font-mono text-sm font-semibold text-fix">{STEPS[player.index].id}</span>
          <h3 className="text-xl font-semibold sm:text-2xl">{STEPS[player.index].title}</h3>
        </div>
        <div className="mt-5">
          {player.index === 0 && <Trajectory />}
          {player.index === 1 && <PassK />}
          {player.index === 2 && <Ladder />}
        </div>
      </motion.section>
      <PlayerBar player={player} steps={STEPS} tone="fix" />
    </div>
  );
}

function Trajectory() {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <div className="rounded-xl border-2 border-bug bg-bg p-5">
        <p className="font-semibold text-bug">Broken run: the final message was polite</p>
        <p className="mt-1 text-sm text-muted">Test only the answer and it passes. Test the path:</p>
        <ul className="mt-4 space-y-2 font-mono text-sm">
          {CHECKS.broken.map((p, i) => (
            <motion.li
              key={p}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 + i * 0.35 }}
              className="rounded-md bg-bug-soft px-3 py-2 text-bug"
            >
              FAIL: {p}
            </motion.li>
          ))}
        </ul>
      </div>
      <div className="rounded-xl border-2 border-fix bg-bg p-5">
        <p className="font-semibold text-fix">Gated run: same checks</p>
        <p className="mt-1 text-sm text-muted">{CHECKS.gatedSteps} steps recorded, then a clean stop.</p>
        <motion.p
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3 + CHECKS.broken.length * 0.35 }}
          className="mt-4 rounded-md bg-fix-soft px-3 py-2 font-mono text-sm text-fix"
        >
          {CHECKS.gated.length === 0 ? "PASS: 0 problems" : CHECKS.gated.map((p) => `FAIL: ${p}`).join(" · ")}
        </motion.p>
        <p className="mt-4 text-sm text-muted">These checks run in your test pipeline, on every run, not by a person.</p>
      </div>
    </div>
  );
}

function PassK() {
  const [p, setP] = useState(0.8);
  const [k, setK] = useState(4);
  const W = 560;
  const H = 220;
  const K = 16;
  const x = (i: number) => 36 + ((i - 1) / (K - 1)) * (W - 52);
  const y = (v: number) => 12 + (1 - v) * (H - 40);
  const line = (q: number) => Array.from({ length: K }, (_, i) => `${x(i + 1)},${y(passHatK(q, i + 1))}`).join(" ");
  const value = passHatK(p, k);

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
      <div>
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label={`Chance that ${k} runs in a row succeed`}>
          {[0, 0.25, 0.5, 0.75, 1].map((v) => (
            <g key={v}>
              <line x1={36} x2={W - 16} y1={y(v)} y2={y(v)} stroke="var(--border)" strokeWidth={1} />
              <text x={30} y={y(v) + 4} textAnchor="end" fontSize={11} fill="var(--muted)">
                {Math.round(v * 100)}%
              </text>
            </g>
          ))}
          {[1, 4, 8, 12, 16].map((i) => (
            <text key={i} x={x(i)} y={H - 8} textAnchor="middle" fontSize={11} fill="var(--muted)">
              k={i}
            </text>
          ))}
          <polyline points={line(0.95)} fill="none" stroke="var(--muted)" strokeWidth={1.5} strokeDasharray="4 4" opacity={0.6} />
          <polyline points={line(p)} fill="none" stroke="var(--fix)" strokeWidth={3} />
          <circle cx={x(k)} cy={y(value)} r={7} fill="var(--fix)" stroke="var(--bg)" strokeWidth={2} />
        </svg>
        <p className="mt-1 text-xs text-muted">Dashed line: 95% per run, for comparison.</p>
      </div>
      <div className="space-y-5">
        <label className="block">
          <span className="text-sm text-muted">One run succeeds</span>
          <span className="block font-mono text-2xl font-bold">{Math.round(p * 100)}%</span>
          <input type="range" min={0.5} max={0.99} step={0.01} value={p} onChange={(e) => setP(Number(e.target.value))} className="w-full accent-[var(--fix)]" />
        </label>
        <label className="block">
          <span className="text-sm text-muted">Runs in a row (k)</span>
          <span className="block font-mono text-2xl font-bold">{k}</span>
          <input type="range" min={1} max={16} step={1} value={k} onChange={(e) => setK(Number(e.target.value))} className="w-full accent-[var(--fix)]" />
        </label>
        <div className="rounded-xl border border-fix bg-fix-soft p-4">
          <p className="text-sm text-muted">All {k} runs succeed</p>
          <p className="font-mono text-4xl font-bold text-fix tabular-nums">{Math.round(value * 100)}%</p>
        </div>
        <p className="text-sm text-muted">Your customers do not get your best run. They get every run.</p>
      </div>
    </div>
  );
}

function Ladder() {
  return (
    <div className="space-y-6">
      <ol className="grid gap-3 md:grid-cols-4">
        {LADDER.map((s, i) => (
          <motion.li
            key={s.name}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.2 }}
            className="relative rounded-xl border border-line bg-bg p-4"
            style={{ borderColor: `color-mix(in srgb, var(--fix) ${25 + i * 25}%, var(--border))` }}
          >
            <span className="font-mono text-xs text-muted">stage {i + 1}</span>
            <p className="mt-1 text-lg font-semibold">{s.name}</p>
            <p className="mt-1 text-sm text-muted">{s.line}</p>
          </motion.li>
        ))}
      </ol>
      <div className="rounded-xl border border-line bg-bg p-5">
        <p className="font-semibold">Example promotion gate for issue_refund up to 100 EUR</p>
        <ul className="mt-3 grid gap-2 sm:grid-cols-2">
          {PROMOTION_GATE.map((g) => (
            <li key={g} className="flex items-center gap-2 text-sm">
              <span className="text-fix">✓</span> {g}
            </li>
          ))}
        </ul>
        <p className="mt-4 text-sm text-muted">Examples only. Write your own numbers down before you start. Move down just as fast.</p>
      </div>
    </div>
  );
}
