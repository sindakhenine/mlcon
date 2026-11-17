"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Check, ChevronDown, Lightbulb, RotateCcw, Trophy } from "lucide-react";
import { useState, type ReactNode } from "react";
import type { Mission } from "@/lib/s1/lab";

/** On/off switch with a one-line explanation. */
export function Toggle({ label, does, on, onChange }: { label: string; does: string; on: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      role="switch"
      aria-checked={on}
      onClick={() => onChange(!on)}
      className={`flex w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition ${
        on ? "border-fix bg-fix-soft" : "border-bug bg-bug-soft"
      }`}
    >
      <span
        className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition ${on ? "bg-fix" : "bg-surface-2"}`}
        aria-hidden
      >
        <motion.span
          layout
          className="absolute h-5 w-5 rounded-full bg-white shadow"
          style={{ left: on ? 22 : 2 }}
          transition={{ type: "spring", stiffness: 500, damping: 30 }}
        />
      </span>
      <span className="min-w-0">
        <span className={`block text-sm font-semibold ${on ? "text-fix" : "text-bug"}`}>
          {label} {on ? "on" : "off"}
        </span>
        <span className="block text-xs leading-snug text-muted">{does}</span>
      </span>
    </button>
  );
}

/** Small segmented choice, e.g. who asks. */
export function Segmented<T extends string>({
  value,
  options,
  onChange,
  label,
}: {
  value: T;
  options: { id: T; label: string }[];
  onChange: (v: T) => void;
  label: string;
}) {
  return (
    <div role="radiogroup" aria-label={label} className="flex flex-wrap gap-1.5">
      {options.map((o) => (
        <button
          key={o.id}
          role="radio"
          aria-checked={value === o.id}
          onClick={() => onChange(o.id)}
          className={`rounded-full border px-3 py-1.5 text-sm transition ${
            value === o.id ? "border-brand bg-surface-2 font-semibold text-text" : "border-line text-muted hover:text-text"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Card({ title, children, right }: { title: string; children: ReactNode; right?: ReactNode }) {
  return (
    <section className="rounded-2xl border border-line bg-surface p-4">
      <div className="mb-3 flex items-center gap-2">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-muted">{title}</h3>
        <div className="ml-auto">{right}</div>
      </div>
      {children}
    </section>
  );
}

/** Mission list: goal, a hint on demand, and the "why" once solved. */
export function Missions<I, O>({
  missions,
  solved,
  justSolved,
  onDismiss,
  onReset,
}: {
  missions: Mission<I, O>[];
  solved: string[];
  justSolved: string | null;
  onDismiss: () => void;
  onReset: () => void;
}) {
  const [open, setOpen] = useState<string | null>(null);
  const [hint, setHint] = useState<string | null>(null);
  const celebrate = missions.find((m) => m.id === justSolved);
  return (
    <Card
      title={`Missions · ${solved.length} of ${missions.length}`}
      right={
        solved.length > 0 && (
          <button onClick={onReset} className="inline-flex items-center gap-1 text-xs text-muted hover:text-text" title="Start the missions again">
            <RotateCcw size={12} /> reset
          </button>
        )
      }
    >
      <AnimatePresence>
        {celebrate && (
          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 24 }}
            className="fixed inset-x-4 bottom-4 z-50 mx-auto max-w-md rounded-xl border-2 border-fix bg-surface p-4 shadow-2xl"
            role="status"
          >
            <p className="flex items-center gap-2 font-semibold text-fix">
              <Trophy size={18} /> Mission solved: {celebrate.title}
            </p>
            <p className="mt-1 text-sm">{celebrate.why}</p>
            <button onClick={onDismiss} className="mt-2 text-xs font-medium text-brand">
              OK, next mission
            </button>
          </motion.div>
        )}
      </AnimatePresence>
      <ol className="space-y-1.5">
        {missions.map((m, i) => {
          const done = solved.includes(m.id);
          const isOpen = open === m.id;
          return (
            <li key={m.id} className={`rounded-xl border ${done ? "border-fix/50" : "border-line"} bg-bg`}>
              <button
                onClick={() => setOpen(isOpen ? null : m.id)}
                aria-expanded={isOpen}
                className="flex w-full items-center gap-2.5 px-3 py-2 text-left"
              >
                <span
                  className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full font-mono text-xs font-bold ${
                    done ? "bg-fix text-bg" : "bg-surface-2 text-muted"
                  }`}
                >
                  {done ? <Check size={14} strokeWidth={3} /> : i + 1}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold">{m.title}</span>
                  <span className="block text-xs text-muted">{m.goal}</span>
                </span>
                <ChevronDown size={16} className={`shrink-0 text-muted transition ${isOpen ? "rotate-180" : ""}`} />
              </button>
              {isOpen && (
                <div className="space-y-2 px-3 pb-3 text-sm">
                  {done ? (
                    <p className="text-fix">{m.why}</p>
                  ) : hint === m.id ? (
                    <p className="flex gap-2 text-warn">
                      <Lightbulb size={16} className="mt-0.5 shrink-0" /> {m.hint}
                    </p>
                  ) : (
                    <button onClick={() => setHint(m.id)} className="inline-flex items-center gap-1 text-xs font-medium text-brand">
                      <Lightbulb size={14} /> Show a hint
                    </button>
                  )}
                </div>
              )}
            </li>
          );
        })}
      </ol>
    </Card>
  );
}

export function SimBanner({ children }: { children: ReactNode }) {
  return (
    <p className="rounded-xl border border-dashed border-line px-4 py-2 text-center text-xs text-muted sm:text-sm">{children}</p>
  );
}
