"use client";

import { motion } from "framer-motion";
import { Clock, Vote } from "lucide-react";
import { useState, type ReactNode } from "react";
import { pollById } from "@/lib/polls";
import { track, useSiteState } from "@/lib/useSiteState";

function voted(pollId: string): string | null {
  try {
    return window.localStorage.getItem(`mlcon-vote-${pollId}`);
  } catch {
    return null;
  }
}

/**
 * Wraps a Play lab. The audience sees it only while "Play open" is on; the owner
 * always sees it, with a note when it is closed for the audience. Also shows the
 * live vote for this session and passes the spotlight mission down.
 */
export function PlayArea({
  session,
  children,
}: {
  session: "s1" | "s2";
  children: (ctx: { spotlight: string; liveAI: boolean }) => ReactNode;
}) {
  const state = useSiteState();
  const poll = state?.poll ? pollById(state.poll) : undefined;
  const showPoll = poll && poll.session === session;

  if (state?.role === "audience" && !state.playOpen)
    return (
      <div className="flex flex-col gap-4">
        {showPoll && <PollCard key={poll.id} pollId={poll.id} />}
        <div className="mx-auto mt-6 max-w-md rounded-2xl border border-line bg-surface p-8 text-center">
          <Clock className="mx-auto text-brand" size={32} />
          <h3 className="mt-4 text-xl font-semibold">Play opens during the talk</h3>
          <p className="mt-2 text-muted">Keep this page open. It opens by itself when the speaker starts it.</p>
        </div>
      </div>
    );

  return (
    <div className="flex flex-col gap-4">
      {state?.role === "owner" && !state.playOpen && (
        <p className="rounded-xl border border-warn bg-warn-soft px-4 py-2 text-center text-sm text-warn">
          You see Play because you are the owner. It is closed for the audience (admin page: Play open).
        </p>
      )}
      {showPoll && <PollCard key={poll.id} pollId={poll.id} />}
      {children({ spotlight: state?.spotlight ?? "", liveAI: Boolean(state?.liveAI) })}
    </div>
  );
}

function PollCard({ pollId }: { pollId: string }) {
  const poll = pollById(pollId)!;
  const [choice, setChoice] = useState<string | null>(() => voted(pollId));
  return (
    <motion.section
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border-2 border-brand bg-surface p-5"
    >
      <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-brand">
        <Vote size={16} /> Live vote
      </p>
      <h3 className="mt-2 text-lg font-semibold">{poll.question}</h3>
      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        {poll.options.map((o) => (
          <button
            key={o.id}
            disabled={choice !== null}
            onClick={() => {
              setChoice(o.id);
              try {
                window.localStorage.setItem(`mlcon-vote-${pollId}`, o.id);
              } catch {
                // fine
              }
              track({ type: "vote", poll: pollId, option: o.id });
            }}
            className={`rounded-xl border-2 px-4 py-3 text-left font-medium transition ${
              choice === o.id ? "border-brand bg-surface-2" : "border-line hover:border-brand disabled:opacity-50"
            }`}
          >
            {o.label}
          </button>
        ))}
      </div>
      {choice && <p className="mt-3 text-sm text-muted">Thanks! Look at the screen for the results.</p>}
    </motion.section>
  );
}
