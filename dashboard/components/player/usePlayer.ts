"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export interface PlayerState {
  index: number;
  count: number;
  playing: boolean;
  speed: number;
  atStart: boolean;
  atEnd: boolean;
  next: () => void;
  prev: () => void;
  goto: (i: number) => void;
  restart: () => void;
  togglePlay: () => void;
  setSpeed: (s: number) => void;
}

interface Options {
  initial?: number;
  autoMs?: number; // time per step in autoplay, at speed 1
  keyboard?: boolean; // arrows, PageUp/PageDown (clickers), space, R, P
  onPastEnd?: () => void; // "next" on the last step: hand over to the next screen
  onBeforeStart?: () => void; // "back" on the first step: go to the previous screen
}

/** Steps through a trace. Works with a presentation clicker, which sends PageDown / PageUp. */
export function usePlayer(
  count: number,
  { initial = 0, autoMs = 3500, keyboard = true, onPastEnd, onBeforeStart }: Options = {},
): PlayerState {
  // initial -1 means "start at the last step" (used when coming back from the next screen)
  const [index, setIndex] = useState(initial < 0 ? Math.max(count - 1, 0) : Math.min(initial, Math.max(count - 1, 0)));
  const edges = useRef({ onPastEnd, onBeforeStart });
  useEffect(() => {
    edges.current = { onPastEnd, onBeforeStart };
  }, [onPastEnd, onBeforeStart]);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);

  const goto = useCallback((i: number) => setIndex(Math.min(Math.max(i, 0), count - 1)), [count]);
  const next = useCallback(() => setIndex((i) => Math.min(i + 1, count - 1)), [count]);
  const prev = useCallback(() => setIndex((i) => Math.max(i - 1, 0)), []);
  const restart = useCallback(() => {
    setIndex(0);
    setPlaying(false);
  }, []);
  const togglePlay = useCallback(() => setPlaying((p) => !p), []);

  // Autoplay stops by itself at the last step.
  useEffect(() => {
    if (!playing || index >= count - 1) return;
    const t = setTimeout(() => {
      next();
      if (index + 1 >= count - 1) setPlaying(false);
    }, autoMs / speed);
    return () => clearTimeout(t);
  }, [playing, index, count, autoMs, speed, next]);

  useEffect(() => {
    if (!keyboard) return;
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null;
      if (el && (el.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(el.tagName))) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      switch (e.key) {
        case "ArrowRight":
        case "PageDown":
        case " ":
          e.preventDefault();
          setPlaying(false);
          if (index >= count - 1 && edges.current.onPastEnd) edges.current.onPastEnd();
          else next();
          break;
        case "ArrowLeft":
        case "PageUp":
          e.preventDefault();
          setPlaying(false);
          if (index <= 0 && edges.current.onBeforeStart) edges.current.onBeforeStart();
          else prev();
          break;
        case "r":
        case "R":
        case "Home":
          restart();
          break;
        case "End":
          goto(count - 1);
          break;
        case "p":
        case "P":
          togglePlay();
          break;
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [keyboard, next, prev, restart, togglePlay, goto, count, index]);

  return {
    index,
    count,
    playing: playing && index < count - 1,
    speed,
    atStart: index === 0,
    atEnd: index === count - 1,
    next,
    prev,
    goto,
    restart,
    togglePlay,
    setSpeed,
  };
}
