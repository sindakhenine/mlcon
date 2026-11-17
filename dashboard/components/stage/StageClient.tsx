"use client";

import { QRCodeSVG } from "qrcode.react";
import { useEffect, useState } from "react";
import type { Stats } from "@/lib/stats";
import { POLLS } from "@/lib/polls";
import { S1_MISSIONS } from "@/lib/s1/lab";
import { S2_MISSIONS } from "@/lib/s2/lab";
import { PollBars } from "@/app/admin/AdminClient";

interface StageData {
  siteOpen: boolean;
  playOpen: boolean;
  audienceCode: string;
  poll: string;
  stats: Stats;
}

/** Full-screen projector page: QR code, audience code, live counters, open vote. */
export function StageClient({ session }: { session: "s1" | "s2" }) {
  const [d, setD] = useState<StageData | null>(null);
  const [err, setErr] = useState("");
  const [origin, setOrigin] = useState("");

  useEffect(() => {
    const load = async () => {
      try {
        const r = await fetch("/api/stage", { cache: "no-store" });
        if (!r.ok) throw new Error(r.status === 403 ? "Open this page with your private code (owner) or as admin." : `server answered ${r.status}`);
        setD(await r.json());
        setErr("");
      } catch (e) {
        setErr((e as Error).message);
      }
    };
    const first = setTimeout(() => {
      setOrigin(window.location.origin);
      load();
    }, 0);
    const t = setInterval(load, 3000);
    return () => {
      clearTimeout(first);
      clearInterval(t);
    };
  }, []);

  const url = `${origin}/${session}?view=play`;
  const missions = session === "s1" ? S1_MISSIONS : S2_MISSIONS;
  const solvedTotal = d ? missions.reduce((a, m) => a + (d.stats.missions[m.id] ?? 0), 0) : 0;
  const poll = d?.poll ? POLLS.find((p) => p.id === d.poll && p.session === session) : undefined;

  return (
    <div className="grid min-h-screen gap-10 p-10 lg:grid-cols-[auto_1fr]">
      <div className="flex flex-col items-center justify-center gap-5">
        <div className="rounded-3xl bg-white p-6">{origin && <QRCodeSVG value={url} size={340} level="M" />}</div>
        <p className="font-mono text-2xl">{url.replace(/^https?:\/\//, "")}</p>
        {d?.siteOpen ? (
          <p className="text-center text-3xl">
            code: <span className="font-mono font-bold text-brand">{d.audienceCode}</span>
          </p>
        ) : (
          <p className="rounded-xl border border-warn bg-warn-soft px-4 py-2 text-warn">Site is closed for the audience (admin page)</p>
        )}
        {d && !d.playOpen && <p className="text-warn">Play is closed (admin page: Play open)</p>}
      </div>

      <div className="flex flex-col justify-center gap-8">
        <h1 className="text-5xl font-semibold">{session === "s1" ? "Break the context. Fix it." : "Red team the agent."}</h1>
        {err && <p className="text-bug">{err}</p>}
        {d && (
          <div className="grid grid-cols-2 gap-6">
            <Big n={d.stats.visitorsNow} label="people playing now" />
            {session === "s1" ? (
              <Big n={solvedTotal} label="missions solved" tone="fix" />
            ) : (
              <>
                <Big n={d.stats.red.allOn} label="attacks with every control on" />
                <Big n={d.stats.red.blocked} label="blocked by the gateway" tone="fix" />
                <Big n={0} label="EUR paid with every control on" tone="fix" suffix=" EUR" />
              </>
            )}
          </div>
        )}
        {poll && d && (
          <div className="rounded-2xl border border-line bg-surface p-6">
            <p className="text-2xl font-semibold">{poll.question}</p>
            <PollBars poll={poll} counts={d.stats.polls[poll.id] ?? {}} big />
          </div>
        )}
      </div>
    </div>
  );
}

function Big({ n, label, tone, suffix = "" }: { n: number; label: string; tone?: "fix"; suffix?: string }) {
  return (
    <div className="rounded-2xl border border-line bg-surface p-6">
      <p className={`font-mono text-7xl font-bold tabular-nums ${tone === "fix" ? "text-fix" : "text-text"}`}>
        {n}
        {suffix}
      </p>
      <p className="mt-2 text-xl text-muted">{label}</p>
    </div>
  );
}
