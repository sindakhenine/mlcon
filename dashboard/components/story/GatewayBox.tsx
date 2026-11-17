"use client";

import { motion } from "framer-motion";
import { Check, Hand, Minus, X } from "lucide-react";
import type { Check as GatewayCheck } from "@/lib/s2/trace";
import type { Decision } from "@/lib/s2/gateway";

const ICON = {
  pass: { Icon: Check, cls: "bg-fix text-bg", word: "pass" },
  fail: { Icon: X, cls: "bg-bug text-white", word: "fail" },
  hold: { Icon: Hand, cls: "bg-warn text-bg", word: "needs a human" },
  skip: { Icon: Minus, cls: "bg-surface-2 text-muted", word: "not reached" },
} as const;

const VERDICT = {
  allow: { text: "ALLOW", cls: "border-fix bg-fix-soft text-fix" },
  needs_approval: { text: "ASK A HUMAN", cls: "border-warn bg-warn-soft text-warn" },
  deny: { text: "DENY", cls: "border-bug bg-bug-soft text-bug" },
} as const;

/** The gateway: each check lights up in order, then the verdict lands. */
export function GatewayBox({
  tool,
  args,
  checks,
  decision,
}: {
  tool: string;
  args: Record<string, unknown>;
  checks: GatewayCheck[];
  decision: Decision;
}) {
  const v = VERDICT[decision.verdict];
  const stagger = 0.22;
  return (
    <div className="rounded-xl border border-line bg-bg p-4">
      <p className="font-mono text-sm">
        <span className="text-muted">proposed: </span>
        <span className="font-semibold">{tool}</span>
        <span className="text-muted">({Object.entries(args).map(([k, a]) => `${k}=${JSON.stringify(a)}`).join(", ")})</span>
      </p>
      <ol className="mt-4 space-y-1.5">
        {checks.map((c, i) => {
          const { Icon, cls, word } = ICON[c.status];
          return (
            <motion.li
              key={`${c.stage}-${c.name}`}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: c.status === "skip" ? 0.5 : 1, x: 0 }}
              transition={{ delay: i * stagger, duration: 0.25 }}
              className="grid grid-cols-[24px_88px_1fr] items-center gap-3 text-sm sm:grid-cols-[24px_96px_1fr_auto]"
            >
              <motion.span
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: i * stagger + 0.12, type: "spring", stiffness: 500, damping: 20 }}
                className={`flex h-6 w-6 items-center justify-center rounded-full ${cls}`}
                aria-label={word}
              >
                <Icon size={14} strokeWidth={3} />
              </motion.span>
              <span className="font-mono text-xs uppercase tracking-wider text-muted">{c.stage}</span>
              <span className="font-medium">{c.name}</span>
              <span className="col-start-3 font-mono text-xs text-muted sm:col-start-auto">{c.note}</span>
            </motion.li>
          );
        })}
      </ol>
      <motion.div
        initial={{ opacity: 0, scale: 1.4 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: checks.length * stagger + 0.1, type: "spring", stiffness: 300, damping: 18 }}
        className={`mt-4 flex flex-wrap items-center gap-3 rounded-lg border-2 px-4 py-2.5 ${v.cls}`}
      >
        <span className="font-mono text-lg font-bold tracking-wider">{v.text}</span>
        <span className="text-sm">{decision.reason}</span>
      </motion.div>
    </div>
  );
}
