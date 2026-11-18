"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Check, ChevronDown, Eye, Lightbulb, MousePointerClick, RotateCcw, Sparkles, Trophy, Zap } from "lucide-react";
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
          className="absolute h-5 w-5 rounded-full bg-white shadow"
          initial={false}
          animate={{ left: on ? 22 : 2 }}
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

/**
 * "control": something the visitor changes (blue frame).
 * "info": a read-only result (no frame, eye icon), so it never looks like a button.
 */
export function Card({
  title,
  children,
  right,
  variant = "control",
}: {
  title: string;
  children: ReactNode;
  right?: ReactNode;
  variant?: "control" | "info";
}) {
  const info = variant === "info";
  return (
    <section className={info ? "rounded-2xl bg-bg/70 p-4" : "rounded-2xl border border-brand/40 bg-surface p-4 shadow-lg"}>
      <div className="mb-3 flex items-center gap-2">
        {info && <Eye size={14} className="shrink-0 text-muted" />}
        <h3 className={`text-sm font-semibold uppercase tracking-wider ${info ? "text-muted" : "text-brand"}`}>{title}</h3>
        <div className="ml-auto">{right}</div>
      </div>
      {children}
    </section>
  );
}

/** Three steps at the top of Play, so a first-time visitor knows what to do. */
export function PlayHowTo({ steps, note }: { steps: [string, string, string]; note: string }) {
  return (
    <div className="rounded-2xl border border-line bg-surface p-4">
      <ol className="grid gap-3 sm:grid-cols-3">
        {steps.map((s, i) => (
          <li key={s} className="flex items-start gap-3">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand font-mono text-sm font-bold text-bg">
              {i + 1}
            </span>
            <span className="text-sm leading-snug">{s}</span>
          </li>
        ))}
      </ol>
      <p className="mt-3 border-t border-line pt-2 text-xs text-muted">{note}</p>
    </div>
  );
}

/** Heading over each column: what you change (left) and what happens (right). */
export function ColumnHead({ kind, changeKey }: { kind: "controls" | "result"; changeKey?: string }) {
  const [first] = useState(changeKey);
  if (kind === "controls")
    return (
      <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 px-1">
        <MousePointerClick size={18} className="text-brand" />
        <h2 className="whitespace-nowrap text-base font-semibold">You change</h2>
        <span className="text-sm text-muted">tap the switches, buttons and lists</span>
      </div>
    );
  return (
    <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 px-1">
      <Eye size={18} className="text-muted" />
      <h2 className="whitespace-nowrap text-base font-semibold">What happens</h2>
      <span className="text-sm text-muted">read only, updates by itself</span>
      {changeKey !== undefined && changeKey !== first && (
        <motion.span
          key={changeKey}
          initial={{ opacity: 1, scale: 1.2 }}
          animate={{ opacity: 0.3, scale: 1 }}
          transition={{ duration: 1.8 }}
          className="ml-auto inline-flex shrink-0 items-center gap-1 rounded-full bg-brand px-2.5 py-0.5 text-xs font-semibold text-bg"
        >
          <Zap size={12} /> updated
        </motion.span>
      )}
    </div>
  );
}

/** Label for the two "models" in the result: A = instant simulation, B = real Claude. */
export function ModelHead({ which, title, note }: { which: "sim" | "real"; title: string; note: string }) {
  const sim = which === "sim";
  return (
    <div className="flex items-start gap-3">
      <span
        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${sim ? "bg-surface-2 text-text" : "bg-brand text-bg"}`}
        aria-hidden
      >
        {sim ? <Zap size={16} /> : <Sparkles size={16} />}
      </span>
      <div className="min-w-0">
        <p className="text-sm font-semibold">
          <span className="font-mono text-muted">{sim ? "A" : "B"} · </span>
          {title}
        </p>
        <p className="text-xs leading-snug text-muted">{note}</p>
      </div>
    </div>
  );
}

/** Mission list: goal, a hint on demand, and the "why" once solved. */
export function Missions<I, O>({
  missions,
  solved,
  justSolved,
  onDismiss,
  onReset,
  spotlight = "",
}: {
  missions: Mission<I, O>[];
  solved: string[];
  justSolved: string | null;
  onDismiss: () => void;
  onReset: () => void;
  spotlight?: string; // mission the speaker asks everyone to try now
}) {
  const [open, setOpen] = useState<string | null>(null);
  const [hint, setHint] = useState<string | null>(null);
  const celebrate = missions.find((m) => m.id === justSolved);
  const spot = missions.find((m) => m.id === spotlight);
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
      {spot && (
        <p className="mb-3 rounded-xl border-2 border-brand bg-surface-2 px-3 py-2 text-sm font-semibold">
          Everyone, try this now: {spot.title}. {spot.goal}
        </p>
      )}
      <ol className="space-y-1.5">
        {missions.map((m, i) => {
          const done = solved.includes(m.id);
          const isOpen = open === m.id;
          return (
            <li
              key={m.id}
              className={`rounded-xl border ${done ? "border-fix/50" : "border-line"} bg-bg ${
                m.id === spotlight ? "ring-2 ring-brand ring-offset-2 ring-offset-surface" : ""
              }`}
            >
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
