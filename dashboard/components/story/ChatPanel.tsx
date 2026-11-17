"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Bot, User } from "lucide-react";
import { useEffect, useState } from "react";

export interface Mark {
  text: string; // exact substring of the message
  kind: "wrong" | "leak" | "right";
  note: string;
}

export interface ChatMessage {
  id: string;
  from: "customer" | "agent";
  text: string;
  marks?: Mark[];
  typing?: boolean; // reveal letter by letter
}

/** Phone-shaped chat. The last message can type itself; marks appear when typing ends. */
export function ChatPanel({
  messages,
  title = "Acme Home support",
  thinking = false,
  compact = false,
}: {
  messages: ChatMessage[];
  title?: string;
  thinking?: boolean;
  compact?: boolean; // no minimum height (used in Play)
}) {
  return (
    <div
      className={`flex h-full flex-col overflow-hidden rounded-[2rem] border-4 border-surface-2 bg-bg shadow-2xl ${
        compact ? "" : "min-h-[220px] lg:min-h-[420px]"
      }`}
    >
      <div className="flex items-center gap-2 border-b border-line bg-surface px-5 py-3">
        <span className="h-2.5 w-2.5 rounded-full bg-fix" />
        <span className="text-sm font-semibold">{title}</span>
      </div>
      <div className="flex flex-1 flex-col gap-3 overflow-y-auto p-4">
        <AnimatePresence initial={false}>
          {messages.map((m) => (
            <Bubble key={m.id} m={m} />
          ))}
          {thinking && (
            <motion.div
              key="thinking"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex items-center gap-1.5 self-start rounded-2xl bg-surface px-4 py-3"
              aria-label="The assistant is working"
            >
              {[0, 1, 2].map((i) => (
                <motion.span
                  key={i}
                  className="h-2 w-2 rounded-full bg-muted"
                  animate={{ opacity: [0.3, 1, 0.3] }}
                  transition={{ duration: 1, repeat: Infinity, delay: i * 0.2 }}
                />
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

function Bubble({ m }: { m: ChatMessage }) {
  const reduce = useReducedMotion();
  const [typed, setShown] = useState(0);
  const shown = m.typing && !reduce ? typed : m.text.length;

  useEffect(() => {
    if (!m.typing || reduce) return;
    const step = Math.max(1, Math.round(m.text.length / 90)); // about 1.5 s per message
    const t = setInterval(() => setShown((n) => (n >= m.text.length ? n : n + step)), 16);
    return () => clearInterval(t);
  }, [m.typing, m.text, reduce]);

  const done = shown >= m.text.length;
  const mine = m.from === "customer";
  return (
    <motion.div
      initial={{ opacity: 0, y: 12, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      className={`flex max-w-[92%] items-end gap-2 ${mine ? "self-end flex-row-reverse" : "self-start"}`}
    >
      <span
        className={`mb-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${
          mine ? "bg-brand text-bg" : "bg-surface-2 text-text"
        }`}
        aria-hidden
      >
        {mine ? <User size={15} /> : <Bot size={15} />}
      </span>
      <div
        className={`rounded-2xl px-4 py-3 text-[15px] leading-relaxed sm:text-base ${
          mine ? "rounded-br-sm bg-brand text-bg" : "rounded-bl-sm bg-surface text-text"
        }`}
      >
        <span className="sr-only">{mine ? "Customer: " : "Assistant: "}</span>
        {done ? <Marked text={m.text} marks={m.marks ?? []} /> : m.text.slice(0, shown)}
        {!done && <span className="ml-0.5 inline-block h-4 w-0.5 animate-pulse bg-current align-middle" />}
        {done && m.marks && m.marks.length > 0 && (
          <ul className="mt-3 space-y-1 border-t border-line pt-2 text-sm">
            {m.marks.map((mk) => (
              <li key={mk.text} className={mk.kind === "right" ? "text-fix" : "text-bug"}>
                {mk.kind === "right" ? "✓" : "✗"} {mk.note}
              </li>
            ))}
          </ul>
        )}
      </div>
    </motion.div>
  );
}

/** Underlines each mark inside the text. */
function Marked({ text, marks }: { text: string; marks: Mark[] }) {
  const parts: { s: string; mark?: Mark }[] = [];
  let rest = text;
  while (rest.length) {
    let best: { at: number; mark: Mark } | null = null;
    for (const mk of marks) {
      const at = rest.indexOf(mk.text);
      if (at >= 0 && (!best || at < best.at)) best = { at, mark: mk };
    }
    if (!best) {
      parts.push({ s: rest });
      break;
    }
    if (best.at > 0) parts.push({ s: rest.slice(0, best.at) });
    parts.push({ s: best.mark.text, mark: best.mark });
    rest = rest.slice(best.at + best.mark.text.length);
  }
  return (
    <>
      {parts.map((p, i) =>
        p.mark ? (
          <motion.mark
            key={i}
            initial={{ backgroundSize: "0% 100%" }}
            animate={{ backgroundSize: "100% 100%" }}
            transition={{ duration: 0.6, delay: 0.2 + i * 0.15 }}
            title={p.mark.note}
            className={`rounded bg-transparent bg-no-repeat px-0.5 font-semibold text-inherit underline decoration-2 underline-offset-4 ${
              p.mark.kind === "right" ? "decoration-fix" : "decoration-bug"
            }`}
            style={{
              backgroundImage: `linear-gradient(${p.mark.kind === "right" ? "var(--fix-soft)" : "var(--bug-soft)"}, ${
                p.mark.kind === "right" ? "var(--fix-soft)" : "var(--bug-soft)"
              })`,
            }}
          >
            {p.s}
          </motion.mark>
        ) : (
          <span key={i}>{p.s}</span>
        ),
      )}
    </>
  );
}
