"use client";

import { animate, motion, useReducedMotion } from "framer-motion";
import { Scissors } from "lucide-react";
import { useEffect, useState } from "react";

export interface Segment {
  id: string;
  text: string;
  tone?: "bug" | "fix" | "muted";
}

/**
 * Broken pipeline: texts glued with newlines and cut at maxChars.
 * A counter runs up to the cut; everything after the scissors falls away.
 */
export function CutWindow({ segments, maxChars }: { segments: Segment[]; maxChars: number }) {
  const reduce = useReducedMotion();
  const [animated, setCount] = useState(0);
  const count = reduce ? maxChars : animated;
  useEffect(() => {
    if (reduce) return;
    const c = animate(0, maxChars, { duration: 1.6, ease: "linear", onUpdate: (v) => setCount(Math.round(v)) });
    return () => c.stop();
  }, [maxChars, reduce]);

  const rows: (Segment & { kept: string; lost: string; start: number })[] = [];
  for (let i = 0, start = 0; i < segments.length; i++) {
    const s = segments[i];
    const keep = Math.max(0, Math.min(s.text.length, maxChars - start));
    rows.push({ ...s, kept: s.text.slice(0, keep), lost: s.text.slice(keep), start });
    start += s.text.length + 1; // + newline
  }
  const cutDone = count >= maxChars;

  return (
    <div className="rounded-xl border border-line bg-bg p-4">
      <div className="mb-3 flex items-center justify-between font-mono text-sm">
        <span className="text-muted">context = &quot;\n&quot;.join(texts)[:{maxChars}]</span>
        <span className={`tabular-nums ${cutDone ? "text-bug" : "text-text"}`}>
          {count}/{maxChars} chars
        </span>
      </div>
      <div className="space-y-1.5 font-mono text-[14px] leading-relaxed sm:text-[15px]">
        {rows.map((r) => (
          <div key={r.id} className="flex items-baseline gap-3">
            <span className="w-44 shrink-0 truncate text-[11px] text-muted">{r.id}</span>
            <span className="min-w-0">
              <span className={r.tone === "fix" ? "text-fix" : r.tone === "bug" ? "text-bug" : "text-text"}>
                {r.kept.split("").map((ch, j) => (
                  <span key={j} style={{ opacity: r.start + j < count ? 1 : 0.15 }}>
                    {ch}
                  </span>
                ))}
              </span>
              {r.lost && r.kept && cutDone && (
                <motion.span
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="mx-1 inline-flex translate-y-0.5 text-bug"
                  aria-label="cut here"
                >
                  <Scissors size={16} />
                </motion.span>
              )}
              {r.lost && (
                <motion.span
                  className="text-muted line-through decoration-bug/60"
                  initial={false}
                  animate={cutDone ? { opacity: 0.35, y: 6, rotate: 1.5 } : { opacity: 0.15, y: 0, rotate: 0 }}
                  transition={{ duration: 0.8, ease: "easeIn" }}
                  style={{ display: "inline-block" }}
                >
                  {r.lost}
                </motion.span>
              )}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Fixed pipeline: the window as sections with a token budget each.
 * Every section shows its capacity and what is used.
 */
export function BudgetWindow({
  budget,
  used,
  highlight,
}: {
  budget: Record<string, number>;
  used: Record<string, number>;
  highlight?: string;
}) {
  const max = Math.max(...Object.values(budget));
  return (
    <div className="rounded-xl border border-line bg-bg p-4">
      <p className="mb-3 font-mono text-sm text-muted">window budget, in tokens</p>
      <div className="space-y-2.5">
        {Object.entries(budget).map(([section, cap], i) => {
          const u = used[section] ?? 0;
          const on = section === highlight;
          return (
            <div key={section} className="grid grid-cols-[88px_1fr_120px] items-center gap-3 font-mono text-sm">
              <span className={on ? "font-semibold text-fix" : "text-muted"}>{section}</span>
              <div className="relative h-4 overflow-hidden rounded-full bg-surface-2" style={{ width: `${(cap / max) * 100}%` }}>
                <motion.div
                  className="h-full rounded-full"
                  style={{ background: on ? "var(--fix)" : "var(--brand)", opacity: on ? 1 : 0.5 }}
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.max((u / cap) * 100, u > 0 ? 2 : 0)}%` }}
                  transition={{ duration: 0.8, delay: 0.1 * i }}
                />
              </div>
              <span className={`text-right tabular-nums ${on ? "text-fix" : "text-muted"}`}>
                {u.toLocaleString("en-US")} / {cap.toLocaleString("en-US")}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
