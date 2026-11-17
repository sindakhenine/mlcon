"use client";

import { motion } from "framer-motion";
import {
  Binary,
  Bot,
  ClipboardCheck,
  Clock,
  Combine,
  Eye,
  FolderOpen,
  Gauge,
  ListOrdered,
  MessageSquare,
  PanelsTopLeft,
  Route,
  Search,
  ShieldCheck,
} from "lucide-react";
import { useMemo } from "react";
import type { Step } from "@/lib/trace";
import type { ContextElement, Manifest } from "@/lib/s1/engine";
import { BUDGET } from "@/lib/s1/engine";
import { traceBroken, traceFixed } from "@/lib/s1/trace";
import { INDEX, QUERY, SYSTEM_PROMPT, USER } from "@/lib/s1/fixtures";
import { usePlayer } from "../player/usePlayer";
import { PlayerBar } from "../player/PlayerBar";
import { Rail, type RailNode } from "../story/Rail";
import { Inspector } from "../story/Inspector";
import { ChatPanel, type ChatMessage, type Mark } from "../story/ChatPanel";
import { FileCard, Chip, type CardState } from "../story/FileCard";
import { BudgetWindow, CutWindow } from "../story/ContextWindow";
import { ManifestView } from "../story/ManifestView";

const BROKEN_NODES: RailNode[] = [
  { id: "question", label: "Question", icon: MessageSquare },
  { id: "embed", label: "Embed", icon: Binary },
  { id: "search", label: "Search", icon: Search },
  { id: "rank", label: "Rank", icon: ListOrdered },
  { id: "open", label: "Open files", icon: FolderOpen },
  { id: "join", label: "Join + cut", icon: Combine },
  { id: "window", label: "Window", icon: PanelsTopLeft },
  { id: "answer", label: "Answer", icon: Bot },
];

const FIXED_NODES: RailNode[] = [
  { id: "select", label: "Select", icon: Route },
  { id: "secure", label: "Secure", icon: ShieldCheck },
  { id: "rank", label: "Rank", icon: ListOrdered },
  { id: "refresh", label: "Refresh", icon: Clock },
  { id: "budget", label: "Budget", icon: Gauge },
  { id: "validate", label: "Validate", icon: ClipboardCheck },
  { id: "observe", label: "Observe", icon: Eye },
  { id: "answer", label: "Answer", icon: Bot },
];

/** Session 1 story: chat on the left, the X-ray on the right, controls below. */
export function S1Story({ run, initial = 0, keyboard = true }: { run: "broken" | "fixed"; initial?: number; keyboard?: boolean }) {
  const steps = useMemo(() => (run === "broken" ? traceBroken() : traceFixed()), [run]);
  const player = usePlayer(steps.length, { initial, keyboard });
  const step = steps[player.index];
  const tone = run === "broken" ? "bug" : "fix";
  const nodes = run === "broken" ? BROKEN_NODES : FIXED_NODES;

  const visited = new Set(steps.slice(0, player.index + 1).map((s) => s.node));
  const problems: Record<string, number[]> = {};
  for (const s of steps.slice(0, player.index + 1))
    for (const p of s.problems ?? []) (problems[s.node] ??= []).push(p);

  const isLast = player.index === steps.length - 1;
  const messages: ChatMessage[] = [
    { id: "q", from: "customer", text: QUERY, typing: player.index === 0 },
  ];
  if (isLast) {
    const d = step.data as { answer: string; marks: Mark[] };
    messages.push({ id: `a-${run}`, from: "agent", text: d.answer, marks: d.marks, typing: true });
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-4 lg:grid-cols-[minmax(300px,32%)_1fr]">
        <ChatPanel messages={messages} thinking={player.index > 0 && !isLast} />
        <div className="flex min-w-0 flex-col gap-4">
          <div className="rounded-2xl border border-line bg-surface/60 py-2">
            <Rail nodes={nodes} active={step.node} visited={visited} problems={problems} tone={tone} />
          </div>
          <Inspector step={step} tone={tone}>
            <StepBody step={step} />
          </Inspector>
        </div>
      </div>
      <PlayerBar player={player} steps={steps} tone={tone} />
    </div>
  );
}

// ---------------------------------------------------------------- per-step views
function StepBody({ step }: { step: Step }) {
  switch (step.id) {
    case "B1":
      return <Asker />;
    case "B2":
      return <Vector />;
    case "B3": {
      const d = step.data as { docs: ContextElement[] };
      return (
        <>
          <Banner tone="bug">Who is asking? Not checked.</Banner>
          <Cards docs={d.docs} />
        </>
      );
    }
    case "B4": {
      const d = step.data as { ranked: ContextElement[] };
      return <Cards docs={d.ranked} ranked highlight={["refund_policy_v1", "refund_policy_v1_scan", "goodwill_guidelines"]} />;
    }
    case "B5": {
      const d = step.data as { ranked: ContextElement[] };
      return <Cards docs={d.ranked} ranked state={() => "open"} stagger={0.25} />;
    }
    case "B6": {
      const d = step.data as { joined: string; maxChars: number; cutDocId: string };
      const ranked = traceBroken()[3].data as { ranked: ContextElement[] };
      return (
        <CutWindow
          maxChars={d.maxChars}
          segments={ranked.ranked.map((e) => ({ id: e.id, text: e.text, tone: e.id === d.cutDocId ? "fix" : undefined }))}
        />
      );
    }
    case "B7": {
      const d = step.data as { system: string; context: string; question: string };
      const cut = traceBroken()[5].data as { survived: string; cutDocId: string };
      const full = INDEX.find((e) => e.id === cut.cutDocId)!.text.length;
      return (
        <div className="space-y-2 font-mono text-sm">
          <Block label="system" text={d.system} />
          <Block label="context" text={d.context} tone="bug" />
          <Block label="question" text={d.question} />
          <p className="pt-1 text-bug">
            {cut.cutDocId}: {cut.survived.length} of {full} characters arrived.
          </p>
        </div>
      );
    }
    case "B8":
    case "F8": {
      const d = step.data as { marks: Mark[] };
      return (
        <ul className="space-y-2">
          {d.marks.map((m) => (
            <li key={m.text} className={`flex items-center gap-2 text-lg ${m.kind === "right" ? "text-fix" : "text-bug"}`}>
              <span className="font-mono font-bold">{m.kind === "right" ? "✓" : "✗"}</span>
              <span className="font-semibold">&quot;{m.text}&quot;</span>
              <span className="text-muted">{m.note}</span>
            </li>
          ))}
        </ul>
      );
    }
    case "F1":
      return <Router />;
    case "F2": {
      const d = step.data as { blocked: string[] };
      return (
        <>
          <Banner tone="fix">
            Searching as {USER.id}, groups: {USER.groups.join(", ")}
          </Banner>
          <Cards
            docs={INDEX}
            showScore={false}
            state={(e) => (d.blocked.includes(e.id) ? "locked" : "idle")}
            reason={() => "staff only, never left the store"}
          />
        </>
      );
    }
    case "F3": {
      const d = step.data as { ranked: ContextElement[] };
      return <Cards docs={d.ranked} ranked />;
    }
    case "F4": {
      const d = step.data as { checks: { id: string; reason: string | null }[] };
      const ranked = traceFixed()[2].data as { ranked: ContextElement[] };
      const why = Object.fromEntries(d.checks.map((c) => [c.id, c.reason]));
      return (
        <Cards
          docs={ranked.ranked}
          state={(e) => (why[e.id] ? "rejected" : "admitted")}
          reason={(e) => why[e.id] ?? undefined}
          stagger={0.3}
        />
      );
    }
    case "F5": {
      const d = step.data as { used: number; admitted: ContextElement[] };
      return (
        <div className="grid gap-4 xl:grid-cols-[1fr_260px]">
          <BudgetWindow
            budget={BUDGET}
            used={{ system: Math.floor(SYSTEM_PROMPT.length / 4), retrieved: d.used, history: Math.floor(QUERY.length / 4) }}
            highlight="retrieved"
          />
          <FileCard doc={d.admitted[0]} state="open" showScore={false} />
        </div>
      );
    }
    case "F6": {
      const d = step.data as { good: { payload: object; result: string }; bad: { payload: object; result: string } };
      return (
        <div className="grid gap-3 md:grid-cols-2">
          <Payload title="get_order result" payload={d.good.payload} ok note="accepted" />
          <Payload title="same call, bad data" payload={d.bad.payload} note={d.bad.result} />
        </div>
      );
    }
    case "F7": {
      const d = step.data as { manifest: Manifest };
      return <ManifestView value={d.manifest} title="manifest req-1.json" good={["refund_policy_v2"]} bad={["superseded"]} />;
    }
    default:
      return null;
  }
}

function Cards({
  docs,
  ranked = false,
  showScore = true,
  highlight = [],
  state,
  reason,
  stagger = 0.08,
}: {
  docs: ContextElement[];
  ranked?: boolean;
  showScore?: boolean;
  highlight?: string[];
  state?: (e: ContextElement) => CardState;
  reason?: (e: ContextElement) => string | undefined;
  stagger?: number;
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 2xl:grid-cols-4">
      {docs.map((e, i) => (
        <div key={e.id} className="relative">
          {ranked && (
            <span className="absolute -left-2 -top-2 z-20 flex h-6 w-6 items-center justify-center rounded-full bg-text font-mono text-xs font-bold text-bg">
              {i + 1}
            </span>
          )}
          <FileCard
            doc={e}
            showScore={showScore}
            highlight={highlight.includes(e.id)}
            state={state?.(e) ?? "idle"}
            reason={reason?.(e)}
            delay={i * stagger}
          />
        </div>
      ))}
    </div>
  );
}

function Banner({ tone, children }: { tone: "bug" | "fix"; children: React.ReactNode }) {
  return (
    <p
      className={`mb-4 inline-flex rounded-lg border px-3 py-1.5 font-mono text-sm font-semibold ${
        tone === "bug" ? "border-bug bg-bug-soft text-bug" : "border-fix bg-fix-soft text-fix"
      }`}
    >
      {children}
    </p>
  );
}

function Asker() {
  return (
    <div className="space-y-3">
      <p className="text-2xl font-medium leading-snug sm:text-3xl">“{QUERY}”</p>
      <div className="flex flex-wrap gap-2">
        <Chip>user: {USER.id}</Chip>
        <Chip>groups: {USER.groups.join(", ")}</Chip>
        <Chip>bought: 45 days ago</Chip>
      </div>
    </div>
  );
}

function Vector() {
  const bars = Array.from(QUERY.slice(0, 32), (ch, i) => ((ch.charCodeAt(0) * 37 + i * 11) % 100) / 100);
  return (
    <div className="flex items-end gap-1.5">
      <div className="flex h-28 flex-1 items-center gap-1">
        {bars.map((v, i) => (
          <motion.span
            key={i}
            className="flex-1 rounded-sm bg-brand"
            initial={{ height: 2 }}
            animate={{ height: `${10 + v * 90}%` }}
            transition={{ delay: i * 0.03, duration: 0.4 }}
            style={{ opacity: 0.4 + v * 0.6 }}
          />
        ))}
      </div>
      <span className="pb-2 font-mono text-sm text-muted">… 1,536</span>
    </div>
  );
}

function Router() {
  const routes = [
    { q: "policy question", to: "policy search", on: true },
    { q: "order status", to: "orders API", on: false },
    { q: "price of a part", to: "price API", on: false },
    { q: "how do I…", to: "manuals search", on: false },
  ];
  return (
    <ul className="space-y-2">
      {routes.map((r, i) => (
        <motion.li
          key={r.q}
          initial={{ opacity: 0, x: -8 }}
          animate={{ opacity: r.on ? 1 : 0.4, x: 0 }}
          transition={{ delay: i * 0.12 }}
          className={`flex items-center gap-3 rounded-lg border px-3 py-2 font-mono text-sm ${
            r.on ? "border-fix bg-fix-soft text-fix" : "border-line text-muted"
          }`}
        >
          <span className="w-40">{r.q}</span>
          <span>→</span>
          <span className="font-semibold">{r.to}</span>
          {r.on && <span className="ml-auto">this one</span>}
        </motion.li>
      ))}
    </ul>
  );
}

function Block({ label, text, tone }: { label: string; text: string; tone?: "bug" }) {
  return (
    <div className={`rounded-lg border p-3 ${tone === "bug" ? "border-bug" : "border-line"} bg-bg`}>
      <p className="mb-1 text-[11px] uppercase tracking-widest text-muted">{label}</p>
      <p className="whitespace-pre-wrap leading-relaxed">{text}</p>
    </div>
  );
}

function Payload({ title, payload, ok = false, note }: { title: string; payload: object; ok?: boolean; note: string }) {
  return (
    <div className={`rounded-xl border-2 bg-bg p-4 ${ok ? "border-fix" : "border-bug"}`}>
      <p className="font-mono text-xs text-muted">{title}</p>
      <pre className="mt-2 whitespace-pre-wrap font-mono text-sm">{JSON.stringify(payload, null, 1)}</pre>
      <p className={`mt-3 font-mono text-sm font-semibold ${ok ? "text-fix" : "text-bug"}`}>
        {ok ? "✓ " : "✗ "}
        {note}
      </p>
    </div>
  );
}
