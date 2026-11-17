"use client";

import { AnimatePresence, motion } from "framer-motion";
import type { ReactNode } from "react";
import type { Step } from "@/lib/trace";
import { ProblemBadge } from "./ProblemBadge";

/** The panel under the rail: what happens at this step, with the exact data. */
export function Inspector({ step, tone, children }: { step: Step; tone: "bug" | "fix"; children?: ReactNode }) {
  const accent = tone === "bug" ? "text-bug" : "text-fix";
  return (
    <AnimatePresence mode="wait">
      <motion.section
        key={step.id}
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        transition={{ duration: 0.35, ease: "easeOut" }}
        className="rounded-2xl border border-line bg-surface p-5 sm:p-6"
        aria-live="polite"
      >
        <div className="flex flex-wrap items-center gap-3">
          <span className={`font-mono text-sm font-semibold ${accent}`}>{step.id}</span>
          <h3 className="text-xl font-semibold sm:text-2xl">{step.title}</h3>
          {step.problems?.map((p) => (
            <ProblemBadge key={p} n={p} title={`Problem ${p} is created here`} />
          ))}
        </div>
        <p className="mt-2 text-base text-muted sm:text-lg">{step.explain}</p>
        {children && <div className="mt-5">{children}</div>}
      </motion.section>
    </AnimatePresence>
  );
}
