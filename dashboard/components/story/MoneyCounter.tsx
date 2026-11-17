"use client";

import { animate, motion, useReducedMotion } from "framer-motion";
import { Banknote, ShieldCheck } from "lucide-react";
import { useEffect, useRef, useState } from "react";

/** Big money display. Ticks up to the new value; red when money left, green when it stayed at 0. */
export function MoneyCounter({ value, label = "refunded", safe = false }: { value: number; label?: string; safe?: boolean }) {
  const reduce = useReducedMotion();
  const [animated, setShown] = useState(value);
  const from = useRef(value);
  const shown = reduce ? value : animated;

  useEffect(() => {
    if (reduce) {
      from.current = value;
      return;
    }
    const c = animate(from.current, value, {
      duration: 0.9,
      ease: "easeOut",
      onUpdate: setShown,
      onComplete: () => (from.current = value),
    });
    return () => {
      from.current = value;
      c.stop();
    };
  }, [value, reduce]);

  const paid = value > 0;
  const tone = paid ? "text-bug" : safe ? "text-fix" : "text-text";
  return (
    <motion.div
      key={paid ? "paid" : "zero"}
      initial={{ scale: 0.96 }}
      animate={{ scale: 1 }}
      className={`flex items-center gap-3 rounded-2xl border bg-surface px-5 py-3 ${paid ? "border-bug shadow-[0_0_28px_var(--bug-soft)]" : safe ? "border-fix" : "border-line"}`}
    >
      {paid || !safe ? <Banknote className={tone} size={28} /> : <ShieldCheck className={tone} size={28} />}
      <div>
        <p className="text-xs uppercase tracking-widest text-muted">{label}</p>
        <p className={`font-mono text-3xl font-bold tabular-nums sm:text-4xl ${tone}`}>
          {shown.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} EUR
        </p>
      </div>
    </motion.div>
  );
}
