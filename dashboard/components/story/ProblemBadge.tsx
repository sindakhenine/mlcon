"use client";

import { motion } from "framer-motion";

/** Red number badge: "problem 3 was created here". */
export function ProblemBadge({ n, size = "md", title }: { n: number; size?: "sm" | "md" | "lg"; title?: string }) {
  const dims = size === "sm" ? "h-5 w-5 text-[11px]" : size === "lg" ? "h-9 w-9 text-base" : "h-7 w-7 text-sm";
  return (
    <motion.span
      initial={{ scale: 0, rotate: -30 }}
      animate={{ scale: 1, rotate: 0 }}
      transition={{ type: "spring", stiffness: 400, damping: 18 }}
      title={title ?? `Problem ${n}`}
      aria-label={title ?? `Problem ${n}`}
      className={`inline-flex shrink-0 items-center justify-center rounded-full bg-bug font-mono font-bold text-white shadow-[0_0_16px_var(--bug)] ${dims}`}
    >
      {n}
    </motion.span>
  );
}
