"use client";

import { Lock, LogOut, OctagonX, Presentation, RefreshCw, RotateCcw } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import type { SiteConfig } from "@/lib/store";
import type { Stats } from "@/lib/stats";
import type { Poll } from "@/lib/polls";
import { useSearch } from "@/lib/useSearch";
import { Toggle } from "@/components/play/Controls";

interface AdminState {
  config: SiteConfig;
  stats: Stats;
  attacks: { t: number; ticket: string; paid: number; allOn: boolean }[];
  setup: { database: "redis" | "memory" | "none"; ownerCode: boolean; adminPassword: boolean };
  polls: Poll[];
  missions: { id: string; title: string }[];
}

/** The admin page: switches, codes, votes, counters. Refreshes every 3 seconds. */
export function AdminClient() {
  const q = useSearch();
  const [state, setState] = useState<AdminState | null>(null);
  const [status, setStatus] = useState<"loading" | "login" | "ready">("loading");
  const [error, setError] = useState("");
  const [codeDraft, setCodeDraft] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const r = await fetch("/api/admin/state", { cache: "no-store" });
      if (r.status === 401) return setStatus("login");
      if (!r.ok) throw new Error(`server answered ${r.status}`);
      setState(await r.json());
      setStatus("ready");
    } catch (e) {
      setError((e as Error).message);
    }
  }, []);

  useEffect(() => {
    const first = setTimeout(load, 0);
    const t = setInterval(load, 3000);
    return () => {
      clearTimeout(first);
      clearInterval(t);
    };
  }, [load]);

  const send = async (body: Record<string, unknown>) => {
    setError("");
    const r = await fetch("/api/admin/state", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) setError(j.error ?? `server answered ${r.status}`);
    await load();
  };

  if (status === "loading") return <p className="text-muted">Loading…</p>;
  if (status === "login") return <Login wrong={q.get("error") === "1"} />;
  if (!state) return null;

  const { config: c, stats: s, setup } = state;
  const noDb = setup.database === "none";

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-center gap-3">
        <Link href="/" className="text-sm text-brand">← Site</Link>
        <h1 className="text-2xl font-semibold">Admin</h1>
        <span className="ml-auto flex gap-2">
          <Link href="/stage/s1" className="inline-flex items-center gap-1 rounded-full border border-line px-3 py-1.5 text-sm">
            <Presentation size={14} /> Stage S1
          </Link>
          <Link href="/stage/s2" className="inline-flex items-center gap-1 rounded-full border border-line px-3 py-1.5 text-sm">
            <Presentation size={14} /> Stage S2
          </Link>
          <button
            onClick={async () => {
              await fetch("/api/admin/login", { method: "DELETE" });
              setStatus("login");
            }}
            className="inline-flex items-center gap-1 rounded-full border border-line px-3 py-1.5 text-sm text-muted"
          >
            <LogOut size={14} /> Log out
          </button>
        </span>
      </header>

      {(noDb || error) && (
        <p className="rounded-xl border border-bug bg-bug-soft px-4 py-3 text-sm text-bug">
          {noDb ? "No database connected. Switches cannot be saved, and the site stays closed to the audience. " : ""}
          {error}
        </p>
      )}

      <section className="grid gap-3 sm:grid-cols-3">
        <Setup ok={setup.ownerCode} label="Your private code" />
        <Setup ok={setup.adminPassword} label="Admin password" />
        <Setup ok={setup.database !== "none"} label={`Database (${setup.database})`} />
      </section>

      <section className="rounded-2xl border border-line bg-surface p-5">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted">Switches</h2>
        <div className="grid gap-2 md:grid-cols-3">
          <Toggle label="Site open" does="Audience can enter with the code below." on={c.siteOpen} onChange={(v) => send({ siteOpen: v })} />
          <Toggle label="Play open" does="Audience can use the Play tabs." on={c.playOpen} onChange={(v) => send({ playOpen: v })} />
          <Toggle label="Live AI" does="Real Claude in Play (phase 8, not built yet)." on={c.liveAI} onChange={(v) => send({ liveAI: v })} />
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            onClick={() => send({ action: "kill" })}
            className="inline-flex items-center gap-2 rounded-xl bg-bug px-4 py-2.5 font-semibold text-white"
          >
            <OctagonX size={18} /> Kill switch: Play and Live AI off
          </button>
          <button
            onClick={() => {
              if (confirm("Reset all counters, votes and the attack log?")) send({ action: "reset" });
            }}
            className="inline-flex items-center gap-2 rounded-xl border border-line px-4 py-2.5 text-sm"
          >
            <RotateCcw size={16} /> Reset counters
          </button>
        </div>
      </section>

      <section className="grid gap-5 md:grid-cols-2">
        <div className="rounded-2xl border border-line bg-surface p-5">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted">Audience code</h2>
          <p className="font-mono text-3xl font-bold">{c.audienceCode || "(none)"}</p>
          <p className="mt-1 text-sm text-muted">
            {c.siteOpen ? "Works now. Show it on the slide." : "Site is closed: this code does not work yet."}
          </p>
          <div className="mt-3 flex gap-2">
            <input
              value={codeDraft ?? c.audienceCode}
              onChange={(e) => setCodeDraft(e.target.value)}
              className="min-w-0 flex-1 rounded-lg border border-line bg-bg px-3 py-2 font-mono"
              aria-label="Audience code"
            />
            <button
              onClick={async () => {
                await send({ audienceCode: codeDraft ?? c.audienceCode });
                setCodeDraft(null);
              }}
              className="rounded-lg border border-brand px-3 py-2 text-sm text-brand"
            >
              Save
            </button>
            <button
              onClick={() => send({ action: "rotate" })}
              title="New random code. Everyone in the audience must enter it again."
              className="inline-flex items-center gap-1 rounded-lg border border-line px-3 py-2 text-sm"
            >
              <RefreshCw size={14} /> New
            </button>
          </div>
        </div>

        <div className="rounded-2xl border border-line bg-surface p-5">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted">Live vote and spotlight</h2>
          <label className="block text-sm">
            Open vote
            <select
              value={c.poll}
              onChange={(e) => send({ poll: e.target.value })}
              className="mt-1 w-full rounded-lg border border-line bg-bg px-3 py-2"
            >
              <option value="">No vote open</option>
              {state.polls.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.session.toUpperCase()}: {p.question.slice(0, 60)}…
                </option>
              ))}
            </select>
          </label>
          <label className="mt-3 block text-sm">
            Spotlight mission (phones open it)
            <select
              value={c.spotlight}
              onChange={(e) => send({ spotlight: e.target.value })}
              className="mt-1 w-full rounded-lg border border-line bg-bg px-3 py-2"
            >
              <option value="">None</option>
              {state.missions.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.title}
                </option>
              ))}
            </select>
          </label>
          <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
            <label>
              Live AI calls per visitor per day
              <input
                type="number"
                min={0}
                max={200}
                defaultValue={c.callsPerVisitor}
                onBlur={(e) => send({ callsPerVisitor: Number(e.target.value) })}
                className="mt-1 w-full rounded-lg border border-line bg-bg px-3 py-2 font-mono"
              />
            </label>
            <label>
              Daily spend cap (USD)
              <input
                type="number"
                min={0}
                max={1000}
                defaultValue={c.dailyCapUsd}
                onBlur={(e) => send({ dailyCapUsd: Number(e.target.value) })}
                className="mt-1 w-full rounded-lg border border-line bg-bg px-3 py-2 font-mono"
              />
            </label>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-line bg-surface p-5">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted">Live numbers</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Num n={s.visitorsNow} label="people here (5 min)" />
          <Num n={s.red.attempts} label="red team attempts" />
          <Num n={s.red.blocked} label="blocked with all controls on" />
          <Num n={s.red.paidRuns} label="runs that paid (controls off)" />
        </div>
        <h3 className="mt-5 text-sm font-semibold">Missions solved (people)</h3>
        <ul className="mt-2 grid gap-1 sm:grid-cols-2">
          {state.missions.map((m) => (
            <li key={m.id} className="flex justify-between rounded-lg bg-bg px-3 py-1.5 text-sm">
              <span>{m.title}</span>
              <span className="font-mono font-bold">{s.missions[m.id] ?? 0}</span>
            </li>
          ))}
        </ul>
        {c.poll && (
          <>
            <h3 className="mt-5 text-sm font-semibold">Votes: {state.polls.find((p) => p.id === c.poll)?.question}</h3>
            <PollBars poll={state.polls.find((p) => p.id === c.poll)!} counts={s.polls[c.poll] ?? {}} />
          </>
        )}
      </section>

      <section className="rounded-2xl border border-line bg-surface p-5">
        <h2 className="mb-1 text-sm font-semibold uppercase tracking-wider text-muted">Attack log (only you see this)</h2>
        <p className="mb-3 text-xs text-muted">Last 50 tickets from the Red team lab. Deleted after 7 days.</p>
        <ul className="max-h-96 space-y-1.5 overflow-auto">
          {state.attacks.length === 0 && <li className="text-sm text-muted">Nothing yet.</li>}
          {state.attacks.map((a, i) => (
            <li key={i} className="rounded-lg bg-bg px-3 py-2 text-sm">
              <span className="font-mono text-xs text-muted">
                {new Date(a.t).toLocaleTimeString()} · {a.paid.toFixed(2)} EUR · {a.allOn ? "all controls on" : "controls off"}
              </span>
              <p className="whitespace-pre-wrap break-words">{a.ticket}</p>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

export function PollBars({ poll, counts, big = false }: { poll: Poll; counts: Record<string, number>; big?: boolean }) {
  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  return (
    <ul className={`mt-2 space-y-2 ${big ? "text-xl" : "text-sm"}`}>
      {poll.options.map((o) => {
        const n = counts[o.id] ?? 0;
        const pct = total ? Math.round((n / total) * 100) : 0;
        return (
          <li key={o.id}>
            <div className="flex justify-between">
              <span>{o.label}</span>
              <span className="font-mono">
                {n} · {pct}%
              </span>
            </div>
            <div className={`mt-1 overflow-hidden rounded-full bg-bg ${big ? "h-5" : "h-2.5"}`}>
              <div className="h-full rounded-full bg-brand transition-all duration-700" style={{ width: `${pct}%` }} />
            </div>
          </li>
        );
      })}
      <li className="text-xs text-muted">{total} votes</li>
    </ul>
  );
}

function Setup({ ok, label }: { ok: boolean; label: string }) {
  return (
    <div className={`rounded-xl border px-4 py-3 text-sm ${ok ? "border-fix text-fix" : "border-warn text-warn"}`}>
      {ok ? "✓" : "!"} {label}: {ok ? "set" : "missing"}
    </div>
  );
}

function Num({ n, label }: { n: number; label: string }) {
  return (
    <div className="rounded-xl bg-bg px-4 py-3">
      <p className="font-mono text-3xl font-bold">{n}</p>
      <p className="text-xs text-muted">{label}</p>
    </div>
  );
}

function Login({ wrong }: { wrong: boolean }) {
  return (
    <div className="mx-auto mt-16 max-w-sm rounded-2xl border border-line bg-surface p-8">
      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-surface-2 text-brand">
        <Lock size={22} />
      </span>
      <h1 className="mt-5 text-2xl font-semibold">Admin</h1>
      <form method="POST" action="/api/admin/login" className="mt-6 flex flex-col gap-3">
        <label htmlFor="pw" className="text-sm font-medium">
          Admin password
        </label>
        <input
          id="pw"
          name="password"
          type="password"
          required
          autoFocus
          className="rounded-lg border border-line bg-bg px-4 py-3 font-mono outline-none focus:border-brand"
        />
        {wrong && <p className="text-sm text-bug">That password is not right.</p>}
        <button className="rounded-lg bg-brand px-4 py-3 font-semibold text-bg">Log in</button>
      </form>
    </div>
  );
}
