"use client";

import { AnimatePresence, motion } from "framer-motion";
import { MessageSquareQuote } from "lucide-react";
import { useEffect } from "react";
import { createPortal } from "react-dom";
import { create } from "zustand";
import { CUES } from "@/lib/cues";
import { useSearch } from "@/lib/useSearch";

/** Speaker state shared by all screens of a session page. */
export const useStage = create<{ cues: boolean; toggleCues: () => void }>((set) => ({
  cues: false,
  toggleCues: () => set((s) => ({ cues: !s.cues })),
}));

/**
 * Stage keys for the whole page: C shows or hides the cue card, F toggles full screen.
 * With ?mode=stage the page uses bigger type for the projector.
 */
export function StageKeys() {
  const stage = useSearch().get("mode") === "stage";
  const toggleCues = useStage((s) => s.toggleCues);

  useEffect(() => {
    if (stage) document.documentElement.setAttribute("data-stage", "on");
    else document.documentElement.removeAttribute("data-stage");
  }, [stage]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null;
      if (el && (el.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(el.tagName))) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === "c" || e.key === "C") toggleCues();
      if (e.key === "f" || e.key === "F") {
        if (document.fullscreenElement) void document.exitFullscreen();
        else void document.documentElement.requestFullscreen().catch(() => undefined);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [toggleCues]);

  return null;
}

/** What to say at this step. Only visible after pressing C. */
export function CueCard({ id, nextId }: { id: string; nextId?: string }) {
  const show = useStage((s) => s.cues);
  const cue = CUES[id];
  const next = nextId ? CUES[nextId] : undefined;
  // Rendered into <body>: a parent with backdrop blur would otherwise trap "position: fixed".
  // `show` is false during the server render, so the portal only runs in the browser.
  if (!show) return null;
  return createPortal(
    <AnimatePresence>
      {show && cue && (
        <motion.aside
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 16 }}
          className="fixed bottom-4 left-4 z-50 w-[min(560px,calc(100vw-2rem))] rounded-2xl border-2 border-warn bg-bg/95 p-4 shadow-2xl backdrop-blur"
          aria-label="Speaker cue"
        >
          <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-warn">
            <MessageSquareQuote size={14} /> Say ({id}) · C to hide
          </p>
          <p className="mt-2 text-lg leading-snug">{cue}</p>
          {next && <p className="mt-3 border-t border-line pt-2 text-sm text-muted">Next: {next.slice(0, 90)}…</p>}
        </motion.aside>
      )}
    </AnimatePresence>,
    document.body,
  );
}
