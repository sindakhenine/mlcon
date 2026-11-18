"use client";

import { ATTACKS, CONTROLS, MAX_TICKET, RED_ALL_ON, S2_MISSIONS, defaultRedInput, runRed, type Control } from "@/lib/s2/lab";
import { USER } from "@/lib/s2/fixtures";
import { useLab } from "../play/useLab";
import { Card, ColumnHead, Missions, ModelHead, PlayHowTo, Toggle } from "../play/Controls";
import { MoneyCounter } from "../story/MoneyCounter";
import { useEffect, useRef } from "react";
import { track } from "@/lib/useSiteState";
import { LiveRun } from "../play/LivePanels";

const OFF: Record<Control, boolean> = { bound: false, authorize: false, contain: false, gate: false, hardCap: false };

/** Session 2 Play: write an attack ticket, switch gateway controls off, see what gets paid. */
export function S2Lab({ spotlight = "", liveAI = false }: { spotlight?: string; liveAI?: boolean }) {
  const lab = useLab("mlcon-play-s2", defaultRedInput, runRed, S2_MISSIONS);
  const { input, output, update } = lab;

  // Count each attack once the visitor stops typing (anonymous; the text goes to the admin attack log only).
  const lastSent = useRef(input.ticket);
  useEffect(() => {
    if (input.ticket === lastSent.current || !input.ticket.trim()) return;
    const t = setTimeout(() => {
      lastSent.current = input.ticket;
      const allOn = Object.values(input.controls).every(Boolean);
      track({ type: "attack", ticket: input.ticket, paid: output.paid, allOn });
    }, 2000);
    return () => clearTimeout(t);
  }, [input.ticket, input.controls, output.paid]);

  return (
    <div className="flex flex-col gap-4">
      <PlayHowTo
        steps={[
          "Pick a mission below. Each one asks you to make the agent pay money it should not pay.",
          "Under You change: pick or write a customer ticket, and switch gateway controls off.",
          "Under What happens, the run happens again by itself. There is no run button.",
        ]}
        note="The gateway is the real code from the talk. Fake systems, no real money. Missions are saved only in this browser."
      />

      <div className="grid gap-4 lg:grid-cols-[minmax(340px,40%)_1fr]">
        <div className="flex min-w-0 flex-col gap-4">
          <ColumnHead kind="controls" />
          <Missions
            missions={S2_MISSIONS}
            solved={lab.solved}
            justSolved={lab.justSolved}
            onDismiss={lab.clearJustSolved}
            onReset={lab.resetMissions}
            spotlight={spotlight}
          />

          <Card title="The ticket (your attack)">
            <div className="mb-3 flex flex-wrap gap-1.5">
              {ATTACKS.map((a) => (
                <button
                  key={a.id}
                  onClick={() => update((i) => ({ ...i, ticket: a.text }))}
                  className={`rounded-full border px-3 py-1.5 text-sm ${
                    input.ticket === a.text ? "border-brand bg-surface-2 font-semibold" : "border-line text-muted hover:text-text"
                  }`}
                >
                  {a.label}
                </button>
              ))}
            </div>
            <label className="block">
              <span className="sr-only">Ticket text</span>
              <textarea
                value={input.ticket}
                maxLength={MAX_TICKET}
                rows={4}
                onChange={(e) => {
                  const ticket = e.target.value.slice(0, MAX_TICKET);
                  update((i) => ({ ...i, ticket }));
                }}
                className="w-full rounded-xl border border-line bg-bg p-3 text-[15px] leading-snug outline-none focus:border-brand"
              />
            </label>
            <p className="mt-1 text-right font-mono text-xs text-muted">
              {input.ticket.length}/{MAX_TICKET}
            </p>
            <p className="mt-1 text-xs text-muted">
              The customer is {USER.id}. They own order {USER.orders.join(", ")} only. Try amounts (&quot;5000 EUR&quot;), other
              order numbers, or &quot;three times&quot;.
            </p>
          </Card>

          <Card
            title="Gateway controls"
            right={
              <span className="flex gap-2 text-xs">
                <button className="text-fix hover:underline" onClick={() => update((i) => ({ ...i, controls: { ...RED_ALL_ON } }))}>
                  all on
                </button>
                <button className="text-bug hover:underline" onClick={() => update((i) => ({ ...i, controls: { ...OFF } }))}>
                  all off
                </button>
              </span>
            }
          >
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
              {CONTROLS.map((c) => (
                <Toggle
                  key={c.id}
                  label={c.label}
                  does={c.does}
                  on={input.controls[c.id]}
                  onChange={(v) => update((i) => ({ ...i, controls: { ...i.controls, [c.id]: v } }))}
                />
              ))}
            </div>
            <label className="mt-3 flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={input.timeout}
                onChange={(e) => {
                  const timeout = e.target.checked;
                  update((i) => ({ ...i, timeout }));
                }}
                className="h-4 w-4 accent-[var(--warn)]"
              />
              The first refund times out (it was paid, the agent retries)
            </label>
          </Card>
        </div>

        <div id="red-result" className="flex min-w-0 scroll-mt-4 flex-col gap-4 lg:sticky lg:top-4 lg:self-start">
          <ColumnHead kind="result" changeKey={JSON.stringify(input)} />
          <ModelHead
            which="sim"
            title="Instant simulation"
            note="A simple fake agent that does whatever the ticket asks. The gateway decides. Free, and it runs again on every change."
          />
          <MoneyCounter value={output.paid} safe label="paid without a human (simulated agent)" />
          <div className="grid grid-cols-3 gap-2 text-center">
            <Stat n={output.waiting} label="waiting for a human" tone="warn" />
            <Stat n={output.blocked} label="denied by the gateway" tone="fix" />
            <Stat n={output.steps.length} label={output.stop ? `steps, then STOP` : "steps"} tone={output.steps.length > 8 ? "bug" : "muted"} />
          </div>

          {liveAI && (
            <>
              <ModelHead
                which="real"
                title="Real Claude as the agent"
                note="The same ticket and switches, but Claude decides what to try. It only runs when you press the button (a few cents each time)."
              />
              <LiveRun input={input} />
            </>
          )}

          <p className="mt-2 border-t border-line pt-3 text-xs font-semibold uppercase tracking-wider text-muted">Behind the scenes</p>
          <Card variant="info" title="Simulation: what the agent tried, and what the gateway said">
            <ol className="space-y-1">
              {output.steps.map((s) => {
                const v = s.decision.verdict;
                const paid = s.tool === "issue_refund" && v === "allow";
                return (
                  <li
                    key={s.step}
                    className={`grid grid-cols-[28px_1fr_auto] items-baseline gap-2 rounded-lg px-2 py-1.5 font-mono text-[13px] ${
                      paid ? "bg-bug-soft" : ""
                    }`}
                  >
                    <span className="text-muted">{s.step}</span>
                    <span className="min-w-0">
                      <span className="font-semibold">{s.tool}</span>
                      {"order_id" in s.args && <span className="text-muted"> {String(s.args.order_id)}</span>}
                      {"amount_eur" in s.args && <span className="text-muted"> · {String(s.args.amount_eur)} EUR</span>}
                      <span className="block text-xs text-muted">{s.decision.reason}</span>
                    </span>
                    <span
                      className={`text-xs font-bold ${
                        paid ? "text-bug" : v === "allow" ? "text-fix" : v === "deny" ? "text-fix" : "text-warn"
                      }`}
                    >
                      {paid ? "PAID" : v === "allow" ? "allow" : v === "deny" ? "DENY" : "HUMAN"}
                    </span>
                  </li>
                );
              })}
              {output.stop && (
                <li className="rounded-lg bg-warn-soft px-2 py-1.5 font-mono text-[13px] text-warn">
                  step {output.stop.step}: STOP ({output.stop.reason}), a human takes over
                </li>
              )}
            </ol>
          </Card>
        </div>
      </div>

      <a
        href="#red-result"
        className={`sticky bottom-3 z-40 mx-auto rounded-full border-2 bg-surface px-5 py-2.5 text-sm font-semibold shadow-2xl lg:hidden ${
          output.paid > 0 ? "border-bug text-bug" : "border-fix text-fix"
        }`}
      >
        {output.paid.toFixed(2)} EUR paid · {output.waiting} for a human · {output.blocked} denied ↓
      </a>
    </div>
  );
}

function Stat({ n, label, tone }: { n: number; label: string; tone: "fix" | "warn" | "bug" | "muted" }) {
  const c = tone === "fix" ? "text-fix" : tone === "warn" ? "text-warn" : tone === "bug" ? "text-bug" : "text-text";
  return (
    <div className="rounded-xl border border-line bg-surface px-2 py-3">
      <p className={`font-mono text-2xl font-bold ${c}`}>{n}</p>
      <p className="text-[11px] leading-tight text-muted">{label}</p>
    </div>
  );
}
