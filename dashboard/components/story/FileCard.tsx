"use client";

import { motion } from "framer-motion";
import { Check, FileText, Lock, X } from "lucide-react";
import type { ContextElement } from "@/lib/s1/engine";

export type CardState = "idle" | "open" | "admitted" | "rejected" | "locked" | "dim";

/**
 * A document from the store. Front: metadata chips. Open: flips to show its text.
 * Rejected cards keep their reason; locked cards never left the store.
 */
export function FileCard({
  doc,
  state = "idle",
  reason,
  showScore = true,
  highlight = false,
  delay = 0,
}: {
  doc: ContextElement;
  state?: CardState;
  reason?: string;
  showScore?: boolean;
  highlight?: boolean;
  delay?: number;
}) {
  const open = state === "open";
  const border =
    state === "admitted"
      ? "border-fix"
      : state === "rejected" || highlight
        ? "border-bug"
        : state === "locked"
          ? "border-line"
          : "border-line";
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: state === "dim" || state === "locked" ? 0.45 : 1, y: 0 }}
      transition={{ duration: 0.4, delay }}
      className="relative h-[156px] [perspective:1000px]"
    >
      <motion.div
        className="relative h-full w-full [transform-style:preserve-3d]"
        initial={false}
        animate={{ rotateY: open ? 180 : 0 }}
        transition={{ duration: 0.6, ease: "easeInOut", delay: open ? delay : 0 }}
      >
        {/* front: metadata */}
        <div className={`absolute inset-0 flex flex-col rounded-xl border-2 bg-surface p-3 [backface-visibility:hidden] ${border}`}>
          <div className="flex items-start gap-2">
            <FileText size={18} className="mt-0.5 shrink-0 text-muted" />
            <p className="break-all font-mono text-[13px] font-semibold leading-snug">{doc.id}</p>
            {showScore && (
              <span className="ml-auto rounded-md bg-surface-2 px-1.5 py-0.5 font-mono text-sm font-bold tabular-nums">
                {doc.score.toFixed(2)}
              </span>
            )}
          </div>
          <div className="mt-auto flex flex-wrap gap-1.5">
            <Chip>{doc.version}</Chip>
            <Chip tone={doc.status === "current" ? "fix" : "bug"}>{doc.status}</Chip>
            <Chip tone={doc.acl.includes("public") ? undefined : "warn"}>acl: {doc.acl.join(", ")}</Chip>
            <Chip>{doc.updatedAt.slice(0, 10)}</Chip>
          </div>
        </div>
        {/* back: the text */}
        <div
          className={`absolute inset-0 flex flex-col rounded-xl border-2 bg-surface-2 p-3 [backface-visibility:hidden] [transform:rotateY(180deg)] ${border}`}
        >
          <p className="font-mono text-[11px] text-muted">{doc.id} · {doc.version} · {doc.status}</p>
          <p className="mt-2 text-[15px] leading-snug">“{doc.text}”</p>
        </div>
      </motion.div>

      {state === "admitted" && (
        <Stamp className="bg-fix text-bg">
          <Check size={14} /> admitted
        </Stamp>
      )}
      {state === "rejected" && (
        <Stamp className="bg-bug text-white">
          <X size={14} /> {reason ?? "rejected"}
        </Stamp>
      )}
      {state === "locked" && (
        <Stamp className="bg-surface-2 text-text">
          <Lock size={14} /> {reason ?? "not allowed"}
        </Stamp>
      )}
    </motion.div>
  );
}

function Stamp({ children, className }: { children: React.ReactNode; className: string }) {
  return (
    <motion.span
      initial={{ scale: 1.6, opacity: 0, rotate: -8 }}
      animate={{ scale: 1, opacity: 1, rotate: -4 }}
      transition={{ type: "spring", stiffness: 380, damping: 16 }}
      className={`absolute -bottom-2 right-2 z-10 inline-flex items-center gap-1 rounded-md px-2 py-1 font-mono text-xs font-bold shadow-lg ${className}`}
    >
      {children}
    </motion.span>
  );
}

export function Chip({ children, tone }: { children: React.ReactNode; tone?: "bug" | "fix" | "warn" }) {
  const c =
    tone === "bug"
      ? "bg-bug-soft text-bug"
      : tone === "fix"
        ? "bg-fix-soft text-fix"
        : tone === "warn"
          ? "bg-warn-soft text-warn"
          : "bg-surface-2 text-muted";
  return <span className={`rounded-md px-1.5 py-0.5 font-mono text-[11px] font-medium ${c}`}>{children}</span>;
}
