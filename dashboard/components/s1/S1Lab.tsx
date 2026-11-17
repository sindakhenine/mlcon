"use client";

import { Plus, Trash2 } from "lucide-react";
import {
  ALL_OFF,
  ALL_ON,
  ASKERS,
  EXTRA_DOCS,
  QUESTIONS,
  S1_MISSIONS,
  SWITCHES,
  defaultInput,
  runLab,
  type Asker,
  type Fate,
  type QuestionId,
} from "@/lib/s1/lab";
import { INDEX } from "@/lib/s1/fixtures";
import type { Status } from "@/lib/s1/engine";
import { useLab } from "../play/useLab";
import { Card, Missions, Segmented, SimBanner, Toggle } from "../play/Controls";
import { ChatPanel } from "../story/ChatPanel";
import { ManifestView } from "../story/ManifestView";
import { Chip } from "../story/FileCard";

const BASE_IDS = new Set(INDEX.map((d) => d.id));

/** Session 1 Play: switch stages off, edit documents, and watch the answer change. */
export function S1Lab({ spotlight = "" }: { spotlight?: string }) {
  const lab = useLab("mlcon-play-s1", defaultInput, runLab, S1_MISSIONS);
  const { input, output, update } = lab;
  const a = output.answer;

  return (
    <div className="flex flex-col gap-4">
      <SimBanner>
        Simulated model: it trusts whatever context it receives, in order. Acme Home is fictional. Your missions are saved only
        in this browser.
      </SimBanner>

      <div className="grid gap-4 lg:grid-cols-[minmax(340px,40%)_1fr]">
        {/* ------------------------------------------------ controls */}
        <div className="flex min-w-0 flex-col gap-4">
          <Missions
            missions={S1_MISSIONS}
            solved={lab.solved}
            justSolved={lab.justSolved}
            onDismiss={lab.clearJustSolved}
            onReset={lab.resetMissions}
            spotlight={spotlight}
          />

          <Card
            title="The six stages"
            right={
              <span className="flex gap-2 text-xs">
                <button className="text-fix hover:underline" onClick={() => update((i) => ({ ...i, switches: { ...ALL_ON } }))}>
                  all on
                </button>
                <button className="text-bug hover:underline" onClick={() => update((i) => ({ ...i, switches: { ...ALL_OFF } }))}>
                  all off
                </button>
              </span>
            }
          >
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
              {SWITCHES.map((s) => (
                <Toggle
                  key={s.id}
                  label={s.label}
                  does={s.does}
                  on={input.switches[s.id]}
                  onChange={(v) => update((i) => ({ ...i, switches: { ...i.switches, [s.id]: v } }))}
                />
              ))}
              <p className="rounded-xl border border-dashed border-line px-3 py-2.5 text-xs text-muted">
                Validate (the sixth stage) checks tool results. It is shown in the story, step F6.
              </p>
            </div>
            <label className="mt-4 block">
              <span className="text-sm text-muted">
                {input.switches.budget ? "Retrieved budget (tokens)" : "Character cut (no budget)"}
              </span>
              <span className="block font-mono text-lg font-bold">
                {input.switches.budget ? input.budgetTokens.toLocaleString("en-US") : input.cutChars}
              </span>
              {input.switches.budget ? (
                <input
                  type="range"
                  min={10}
                  max={8000}
                  step={10}
                  value={input.budgetTokens}
                  onChange={(e) => update((i) => ({ ...i, budgetTokens: Number(e.target.value) }))}
                  className="w-full accent-[var(--fix)]"
                />
              ) : (
                <input
                  type="range"
                  min={20}
                  max={400}
                  step={5}
                  value={input.cutChars}
                  onChange={(e) => update((i) => ({ ...i, cutChars: Number(e.target.value) }))}
                  className="w-full accent-[var(--bug)]"
                />
              )}
            </label>
          </Card>

          <Card title="Who asks, and what">
            <div className="space-y-3">
              <Segmented<Asker>
                label="Who asks"
                value={input.asker}
                options={(Object.keys(ASKERS) as Asker[]).map((k) => ({ id: k, label: ASKERS[k].label }))}
                onChange={(v) => update((i) => ({ ...i, asker: v }))}
              />
              <Segmented<QuestionId>
                label="Question"
                value={input.question}
                options={[
                  { id: "return", label: "Return after 45 days" },
                  { id: "warranty", label: "Leak after 14 months" },
                ]}
                onChange={(v) => update((i) => ({ ...i, question: v }))}
              />
            </div>
          </Card>

          <Card title="Documents in the store">
            <ul className="space-y-2">
              {input.docs.map((d) => (
                <li key={d.id} className="rounded-xl border border-line bg-bg p-3">
                  <div className="flex items-center gap-2">
                    <span className="min-w-0 flex-1 truncate font-mono text-[13px] font-semibold">{d.id}</span>
                    {!BASE_IDS.has(d.id) && (
                      <button
                        onClick={() => update((i) => ({ ...i, docs: i.docs.filter((x) => x.id !== d.id) }))}
                        className="text-muted hover:text-bug"
                        aria-label={`Remove ${d.id}`}
                      >
                        <Trash2 size={15} />
                      </button>
                    )}
                  </div>
                  <p className="mt-1 text-xs text-muted">“{d.text}”</p>
                  <div className="mt-2 flex flex-wrap items-center gap-1.5">
                    <select
                      value={d.status}
                      onChange={(e) =>
                        update((i) => ({
                          ...i,
                          docs: i.docs.map((x) => (x.id === d.id ? { ...x, status: e.target.value as Status } : x)),
                        }))
                      }
                      aria-label={`Status of ${d.id}`}
                      className={`rounded-md border border-line bg-surface-2 px-1.5 py-0.5 font-mono text-[11px] ${
                        d.status === "current" ? "text-fix" : "text-bug"
                      }`}
                    >
                      {(["current", "superseded", "draft"] as Status[]).map((s) => (
                        <option key={s}>{s}</option>
                      ))}
                    </select>
                    {(["public", "staff"] as const).map((g) => {
                      const has = d.acl.includes(g);
                      return (
                        <button
                          key={g}
                          onClick={() =>
                            update((i) => ({
                              ...i,
                              docs: i.docs.map((x) =>
                                x.id === d.id ? { ...x, acl: has ? x.acl.filter((y) => y !== g) : [...x.acl, g] } : x,
                              ),
                            }))
                          }
                          aria-pressed={has}
                          className={`rounded-md px-1.5 py-0.5 font-mono text-[11px] ${
                            has ? (g === "staff" ? "bg-warn-soft text-warn" : "bg-surface-2 text-text") : "text-muted line-through"
                          }`}
                        >
                          {g}
                        </button>
                      );
                    })}
                    <Chip>{d.source}</Chip>
                    <Chip>{d.updatedAt.slice(0, 10)}</Chip>
                  </div>
                </li>
              ))}
            </ul>
            <div className="mt-3 flex flex-wrap gap-2">
              {EXTRA_DOCS.filter((x) => !input.docs.some((d) => d.id === x.doc.id)).map((x) => (
                <button
                  key={x.doc.id}
                  onClick={() => update((i) => ({ ...i, docs: [...i.docs, { ...x.doc }] }))}
                  className="inline-flex items-center gap-1 rounded-full border border-brand px-3 py-1.5 text-sm text-brand hover:bg-surface-2"
                >
                  <Plus size={14} /> {x.label}
                </button>
              ))}
            </div>
          </Card>
        </div>

        {/* ------------------------------------------------ result */}
        <div id="lab-answer" className="flex min-w-0 scroll-mt-4 flex-col gap-4 lg:sticky lg:top-4 lg:self-start">
          <div>
            <ChatPanel
              compact
              messages={[
                { id: `q-${input.question}`, from: "customer", text: QUESTIONS[input.question].text },
                { id: `a-${a.text}`, from: "agent", text: a.text, marks: a.marks },
              ]}
              title={`Acme Home support · asked by ${ASKERS[input.asker].label.toLowerCase()}`}
            />
          </div>
          <p
            role="status"
            className={`rounded-xl border-2 px-4 py-3 text-center font-semibold ${
              a.correct ? "border-fix bg-fix-soft text-fix" : "border-bug bg-bug-soft text-bug"
            }`}
          >
            {a.correct ? "✓ Correct answer" : "✗ Wrong answer"}
            {a.leak ? " · staff-only rule leaked" : ""}
          </p>

          <Card title={`What happened to each document · top ${output.k}`}>
            <ul className="space-y-1.5">
              {output.rows.map((r) => (
                <li key={r.doc.id} className="flex items-center gap-2 font-mono text-[13px]">
                  <span className="min-w-0 flex-1 truncate">{r.doc.id}</span>
                  <FateChip fate={r.fate} />
                </li>
              ))}
            </ul>
          </Card>

          <Card title="What the model received">
            <pre className="whitespace-pre-wrap rounded-lg bg-bg p-3 font-mono text-[13px] leading-relaxed">
              {output.context || "(nothing)"}
            </pre>
          </Card>

          {output.manifest ? (
            <ManifestView
              key={JSON.stringify(output.manifest)}
              value={output.manifest}
              title="manifest (Observe is on)"
              good={output.manifest.admitted.map((x) => x.id)}
              bad={["status=", "ttl_expired", "duplicate", "budget:"]}
            />
          ) : (
            <p className="rounded-xl border border-dashed border-bug px-4 py-3 text-sm text-bug">
              Observe is off: no manifest. Good luck explaining this answer next week.
            </p>
          )}
        </div>
      </div>

      {/* phones: the result is far below the switches, so keep a summary on screen */}
      <a
        href="#lab-answer"
        className={`sticky bottom-3 z-40 mx-auto rounded-full border-2 px-5 py-2.5 text-sm font-semibold shadow-2xl lg:hidden ${
          a.correct ? "border-fix bg-surface text-fix" : "border-bug bg-surface text-bug"
        }`}
      >
        {a.correct ? "✓ Correct" : `✗ Wrong${a.days !== null ? `: ${a.days} days` : ""}`}
        {a.leak ? " · leak" : ""} · see answer ↑
      </a>
    </div>
  );
}

function FateChip({ fate }: { fate: Fate }) {
  switch (fate.kind) {
    case "in":
      return fate.chars < fate.of ? (
        <Chip tone="bug">
          #{fate.rank} in, cut: {fate.chars}/{fate.of} chars
        </Chip>
      ) : (
        <Chip tone="fix">#{fate.rank} in the window</Chip>
      );
    case "select":
      return <Chip>Select: not searched</Chip>;
    case "secure":
      return <Chip>Secure: not allowed</Chip>;
    case "rank":
      return <Chip>not in top results</Chip>;
    case "rejected":
      return <Chip tone="warn">rejected: {fate.reason}</Chip>;
  }
}
