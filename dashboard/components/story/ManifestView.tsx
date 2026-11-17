"use client";

import { motion } from "framer-motion";

/**
 * Pretty JSON that writes itself line by line.
 * Lines with a rejection reason glow red, admitted ids glow green.
 */
export function ManifestView({
  value,
  title = "manifest.json",
  good = [],
  bad = [],
}: {
  value: unknown;
  title?: string;
  good?: string[]; // substrings to mark green
  bad?: string[]; // substrings to mark red
}) {
  const lines = JSON.stringify(value, null, 2).split("\n");
  return (
    <div className="overflow-hidden rounded-xl border border-line bg-bg">
      <div className="border-b border-line px-4 py-2 font-mono text-xs text-muted">{title}</div>
      <pre className="max-h-[360px] overflow-auto p-4 font-mono text-[13px] leading-relaxed sm:text-sm">
        {lines.map((line, i) => {
          const isBad = bad.some((b) => line.includes(b));
          const isGood = !isBad && good.some((g) => line.includes(g));
          return (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -6 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.2, delay: Math.min(i * 0.04, 1.6) }}
              className={`-mx-2 rounded px-2 ${isBad ? "bg-bug-soft text-bug" : isGood ? "bg-fix-soft text-fix" : "text-text"}`}
            >
              {line || " "}
            </motion.div>
          );
        })}
      </pre>
    </div>
  );
}
