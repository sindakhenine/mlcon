"use client";

import { Bot, Sparkles } from "lucide-react";
import { useState } from "react";
import type { LabInput } from "@/lib/s1/lab";
import type { RedInput } from "@/lib/s2/lab";
import { cents, streamLive } from "@/lib/liveClient";

/**
 * Session 1: the same context, answered by the real model.
 * Only shown while Live AI is on (switched by Sinda on the admin page).
 */
export function LiveAnswer({ input }: { input: LabInput }) {
  const [state, setState] = useState<{
    status: "idle" | "running" | "done" | "error";
    text: string;
    model?: string;
    cost?: number;
    key?: string;
    error?: string;
  }>({ status: "idle", text: "" });
  const key = JSON.stringify(input);
  const stale = state.status === "done" && state.key !== key;

  const ask = async () => {
    setState({ status: "running", text: "", key });
    try {
      await streamLive("/api/live/s1", input, (e) => {
        if (e.type === "start") setState((s) => ({ ...s, model: String(e.model) }));
        if (e.type === "text") setState((s) => ({ ...s, text: s.text + String(e.delta) }));
        if (e.type === "done") setState((s) => ({ ...s, status: "done", cost: Number(e.costUsd), model: String(e.model) }));
        if (e.type === "error") setState((s) => ({ ...s, status: "error", error: String(e.message) }));
      });
    } catch (err) {
      setState((s) => ({ ...s, status: "error", error: (err as Error).message }));
    }
  };

  return (
    <section className="rounded-2xl border-2 border-brand bg-surface p-4">
      <div className="flex flex-wrap items-center gap-2">
        <Sparkles size={18} className="text-brand" />
        <h3 className="font-semibold">Ask Claude</h3>
        <button
          onClick={ask}
          disabled={state.status === "running"}
          className="ml-auto rounded-full bg-brand px-4 py-2 text-sm font-semibold text-bg disabled:opacity-50"
        >
          {state.status === "running" ? "Asking…" : stale ? "Ask again with the new settings" : "Ask real Claude with this context"}
        </button>
      </div>
      <p className="mt-1 text-xs text-muted">
        A real model is also wrong when its context is wrong. Try it after you broke the simulation.
      </p>
      {stale && (
        <p className="mt-2 rounded-lg bg-warn-soft px-3 py-1.5 text-sm font-semibold text-warn">
          You changed the settings. This is the old answer: press the button to ask again.
        </p>
      )}
      {state.text && (
        <div className={`mt-3 flex gap-2 rounded-xl bg-bg p-3 ${stale ? "opacity-50" : ""}`}>
          <Bot size={18} className="mt-0.5 shrink-0 text-brand" />
          <p className="whitespace-pre-wrap text-[15px] leading-relaxed">{state.text}</p>
        </div>
      )}
      {state.status === "done" && (
        <p className="mt-2 font-mono text-xs text-muted">
          {state.model} · {cents(state.cost ?? 0)}

        </p>
      )}
      {state.status === "error" && <p className="mt-2 text-sm text-bug">{state.error}</p>}
    </section>
  );
}

interface LiveStepView {
  step: number;
  tool: string;
  args: Record<string, unknown>;
  decision: { verdict: string; reason: string };
  paid: number;
  note?: string;
}

/** Session 2: the real model reads the ticket and proposes actions; the gateway decides. */
export function LiveRun({ input }: { input: RedInput }) {
  const [steps, setSteps] = useState<LiveStepView[]>([]);
  const [texts, setTexts] = useState<string[]>([]);
  const [runKey, setRunKey] = useState("");
  const key = JSON.stringify(input);
  const [st, setSt] = useState<{ status: "idle" | "running" | "done" | "error"; paid: number; cost?: number; model?: string; stop?: string | null; error?: string }>({
    status: "idle",
    paid: 0,
  });

  const staleRun = st.status === "done" && runKey !== key;

  const run = async () => {
    setSteps([]);
    setTexts([]);
    setRunKey(key);
    setSt({ status: "running", paid: 0 });
    try {
      await streamLive("/api/live/s2", input, (e) => {
        if (e.type === "start") setSt((s) => ({ ...s, model: String(e.model) }));
        if (e.type === "step") {
          setSteps((x) => [...x, e as unknown as LiveStepView]);
          setSt((s) => ({ ...s, paid: Number(e.total) }));
        }
        if (e.type === "text") setTexts((x) => [...x, String(e.text)]);
        if (e.type === "done")
          setSt((s) => ({ ...s, status: "done", paid: Number(e.paid), cost: Number(e.costUsd), stop: (e.stop as string) ?? null }));
        if (e.type === "error") setSt((s) => ({ ...s, status: "error", error: String(e.message) }));
      });
    } catch (err) {
      setSt((s) => ({ ...s, status: "error", error: (err as Error).message }));
    }
  };

  return (
    <section className="rounded-2xl border-2 border-brand bg-surface p-4">
      <div className="flex flex-wrap items-center gap-2">
        <Sparkles size={18} className="text-brand" />
        <h3 className="font-semibold">Run with Claude</h3>
        <button
          onClick={run}
          disabled={st.status === "running" || !input.ticket.trim()}
          className="ml-auto rounded-full bg-brand px-4 py-2 text-sm font-semibold text-bg disabled:opacity-50"
        >
          {st.status === "running" ? "Running…" : staleRun ? "Run again with the new settings" : "Run this ticket with real Claude"}
        </button>
      </div>
      <p className="mt-1 text-xs text-muted">
        The gateway with your switches decides what happens. Fake systems, no real money.
      </p>
      {staleRun && (
        <p className="mt-2 rounded-lg bg-warn-soft px-3 py-1.5 text-sm font-semibold text-warn">
          You changed the ticket or the switches. This is the old run: press the button to run again.
        </p>
      )}
      {(steps.length > 0 || st.status === "running") && (
        <p className={`mt-3 font-mono text-2xl font-bold ${st.paid > 0 ? "text-bug" : "text-fix"}`}>{st.paid.toFixed(2)} EUR paid</p>
      )}
      <ol className="mt-2 space-y-1">
        {steps.map((s) => {
          const v = s.decision.verdict;
          const paid = s.paid > 0;
          return (
            <li key={s.step} className={`rounded-lg px-2 py-1.5 font-mono text-[13px] ${paid ? "bg-bug-soft" : ""}`}>
              <span className="text-muted">{s.step} </span>
              <span className="font-semibold">{s.tool}</span>
              <span className="text-muted"> {Object.values(s.args).map(String).join(" · ").slice(0, 80)}</span>
              <span className={`float-right text-xs font-bold ${paid ? "text-bug" : v === "needs_approval" ? "text-warn" : "text-fix"}`}>
                {paid ? "PAID" : v === "allow" ? "allow" : v === "deny" ? "DENY" : "HUMAN"}
              </span>
              <span className="block text-xs text-muted">
                {s.decision.reason}
                {s.note ? ` · ${s.note}` : ""}
              </span>
            </li>
          );
        })}
      </ol>
      {texts.length > 0 && (
        <div className="mt-3 flex gap-2 rounded-xl bg-bg p-3">
          <Bot size={18} className="mt-0.5 shrink-0 text-brand" />
          <p className="whitespace-pre-wrap text-sm">{texts[texts.length - 1]}</p>
        </div>
      )}
      {st.status === "done" && (
        <p className="mt-2 font-mono text-xs text-muted">
          {st.model} · {steps.length} steps{st.stop ? ` · stopped: ${st.stop}` : ""} · {cents(st.cost ?? 0)}
        </p>
      )}
      {st.status === "error" && <p className="mt-2 text-sm text-bug">{st.error}</p>}
    </section>
  );
}
