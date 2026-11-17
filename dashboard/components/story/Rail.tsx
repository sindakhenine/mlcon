"use client";

import { motion } from "framer-motion";
import type { LucideIcon } from "lucide-react";
import { ProblemBadge } from "./ProblemBadge";

export interface RailNode {
  id: string;
  label: string;
  icon: LucideIcon;
}

/**
 * The pipeline as a line of stations. The active station glows, visited ones are
 * filled, future ones are dim. Problem badges sit on the station that created them.
 */
export function Rail({
  nodes,
  active,
  visited,
  problems = {},
  tone,
}: {
  nodes: RailNode[];
  active: string;
  visited: Set<string>;
  problems?: Record<string, number[]>;
  tone: "bug" | "fix";
}) {
  const color = tone === "bug" ? "var(--bug)" : "var(--fix)";
  const activeIdx = nodes.findIndex((n) => n.id === active);
  const lastVisited = Math.max(activeIdx, ...nodes.map((n, i) => (visited.has(n.id) ? i : -1)));
  const progress = nodes.length > 1 ? Math.max(lastVisited, 0) / (nodes.length - 1) : 0;

  return (
    <div className="overflow-x-auto pb-2">
      <div className="relative mx-auto flex min-w-[560px] items-start justify-between px-6 pt-3">
        {/* track */}
        <div className="absolute left-10 right-10 top-[34px] h-1 rounded-full bg-surface-2" />
        <motion.div
          className="absolute left-10 top-[34px] h-1 rounded-full"
          style={{ background: color, boxShadow: `0 0 12px ${color}` }}
          initial={false}
          animate={{ width: `calc((100% - 5rem) * ${progress})` }}
          transition={{ duration: 0.6, ease: "easeInOut" }}
        />
        {nodes.map((n) => {
          const isActive = n.id === active;
          const isVisited = visited.has(n.id);
          const Icon = n.icon;
          return (
            <div key={n.id} className="relative z-10 flex w-20 flex-col items-center gap-2 text-center">
              <motion.div
                initial={false}
                animate={{ scale: isActive ? 1.18 : 1 }}
                transition={{ type: "spring", stiffness: 300, damping: 20 }}
                className="relative flex h-12 w-12 items-center justify-center rounded-full border-2"
                style={{
                  borderColor: isActive || isVisited ? color : "var(--border)",
                  background: isActive ? color : isVisited ? "var(--surface-2)" : "var(--surface)",
                  color: isActive ? "var(--bg)" : isVisited ? color : "var(--muted)",
                  boxShadow: isActive ? `0 0 24px ${color}` : "none",
                }}
              >
                <Icon size={20} strokeWidth={2.2} />
                {isActive && (
                  <motion.span
                    className="absolute inset-0 rounded-full"
                    style={{ border: `2px solid ${color}` }}
                    initial={{ scale: 1, opacity: 0.8 }}
                    animate={{ scale: 1.7, opacity: 0 }}
                    transition={{ duration: 1.4, repeat: Infinity, ease: "easeOut" }}
                  />
                )}
                {(problems[n.id] ?? []).length > 0 && (
                  <span className="absolute -right-2 -top-2 flex gap-0.5">
                    {problems[n.id].map((p) => (
                      <ProblemBadge key={p} n={p} size="sm" />
                    ))}
                  </span>
                )}
              </motion.div>
              <span
                className={`text-xs font-medium leading-tight sm:text-sm ${
                  isActive ? "text-text" : isVisited ? "text-muted" : "text-muted/60"
                }`}
              >
                {n.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
