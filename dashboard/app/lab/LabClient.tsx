"use client";

import { useMemo, useState } from "react";
import { S1Story } from "@/components/s1/S1Story";
import { GatewayBox } from "@/components/story/GatewayBox";
import { MoneyCounter } from "@/components/story/MoneyCounter";
import { traceGated, brokenPayments } from "@/lib/s2/trace";
import type { Check } from "@/lib/s2/trace";
import type { Decision } from "@/lib/s2/gateway";

type Tab = "s1-broken" | "s1-fixed" | "s2-parts";

/** Phase 2 test page: the player and every visual building block. Not linked from the home page. */
export function LabClient() {
  const [tab, setTab] = useState<Tab>("s1-broken");
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap gap-2">
        {(
          [
            ["s1-broken", "Session 1, broken"],
            ["s1-fixed", "Session 1, fixed"],
            ["s2-parts", "Session 2 parts"],
          ] as [Tab, string][]
        ).map(([id, label]) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`rounded-full border px-4 py-2 text-sm font-medium ${
              tab === id ? "border-brand bg-surface-2 text-text" : "border-line text-muted"
            }`}
          >
            {label}
          </button>
        ))}
        <span className="ml-auto self-center text-sm text-muted">Keys: → next, ← back, P play, R restart</span>
      </div>
      {tab === "s1-broken" && <S1Story key="b" run="broken" />}
      {tab === "s1-fixed" && <S1Story key="f" run="fixed" />}
      {tab === "s2-parts" && <S2Parts />}
    </div>
  );
}

function S2Parts() {
  const gated = useMemo(() => traceGated(), []);
  const pay = useMemo(() => brokenPayments(), []);
  const [payIdx, setPayIdx] = useState(0);
  const [gIdx, setGIdx] = useState(3);
  const g = gated[gIdx].data as { tool: string; args: Record<string, unknown>; checks: Check[]; decision: Decision };
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <section className="space-y-3">
        <h2 className="font-semibold">Money counter (broken run)</h2>
        <MoneyCounter value={pay[payIdx].total} />
        <div className="flex flex-wrap gap-2">
          {pay.slice(0, 6).map((p, i) => (
            <button key={i} onClick={() => setPayIdx(i)} className="rounded-md border border-line px-2 py-1 font-mono text-xs">
              step {p.step}
            </button>
          ))}
        </div>
        <h2 className="pt-4 font-semibold">Money counter (gated run)</h2>
        <MoneyCounter value={0} safe label="refunded without a human" />
      </section>
      <section className="space-y-3">
        <h2 className="font-semibold">Gateway box</h2>
        <div className="flex flex-wrap gap-2">
          {gated.slice(1, 9).map((s, i) => (
            <button
              key={s.id}
              onClick={() => setGIdx(i + 1)}
              className={`rounded-md border px-2 py-1 font-mono text-xs ${gIdx === i + 1 ? "border-brand" : "border-line"}`}
            >
              {s.id}
            </button>
          ))}
        </div>
        {g.checks && <GatewayBox key={gIdx} tool={g.tool} args={g.args} checks={g.checks} decision={g.decision} />}
      </section>
    </div>
  );
}
