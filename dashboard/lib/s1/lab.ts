/**
 * Session 1 Play: the Context Lab (PLAN.md 6.1).
 * The same engine functions as the story, with switches the audience can turn off,
 * documents they can edit or add, and a small rule-based "simulated model".
 * Pure functions: no network, runs in the browser.
 */
import {
  BUDGET,
  element,
  fitBudget,
  isFresh,
  newManifest,
  type ContextElement,
  type Manifest,
  type Status,
} from "./engine";
import { INDEX, NOW, QUERY } from "./fixtures";
import type { Mark } from "@/components/story/ChatPanel";

export type Switch = "select" | "secure" | "refresh" | "budget" | "observe";
export const SWITCHES: { id: Switch; label: string; does: string }[] = [
  { id: "select", label: "Select", does: "Policy questions search only the policy system, not the web." },
  { id: "secure", label: "Secure", does: "Search with the asker's permissions, before ranking." },
  { id: "refresh", label: "Refresh", does: "Drop old, draft and expired documents." },
  { id: "budget", label: "Budget", does: "Drop duplicates, fit a token budget, never cut text." },
  { id: "observe", label: "Observe", does: "Write a manifest of what went in and why." },
];

export type Asker = "customer" | "staff";
export const ASKERS: Record<Asker, { user: string; groups: string[]; label: string }> = {
  customer: { user: "cust-4471", groups: ["public"], label: "Customer" },
  staff: { user: "staff-0193", groups: ["public", "staff"], label: "Staff member" },
};

export type QuestionId = "return" | "warranty";
export const QUESTIONS: Record<QuestionId, { text: string; scores: Record<string, number> }> = {
  return: {
    text: QUERY,
    scores: {
      refund_policy_v1: 0.91,
      refund_policy_v1_scan: 0.9,
      goodwill_guidelines: 0.86,
      refund_policy_v2: 0.83,
      refund_policy_v3_draft: 0.92,
      web_faq_2025: 0.93,
    },
  },
  warranty: {
    text: "My dishwasher is 14 months old and leaks. Is it covered?",
    scores: {
      refund_policy_v1: 0.62,
      refund_policy_v1_scan: 0.61,
      goodwill_guidelines: 0.71,
      refund_policy_v2: 0.84,
      refund_policy_v3_draft: 0.6,
      web_faq_2025: 0.66,
    },
  },
};

/** Documents the audience can add with one tap. */
export const EXTRA_DOCS: { doc: ContextElement; label: string }[] = [
  {
    label: "Draft v3 (not approved yet)",
    doc: element({
      id: "refund_policy_v3_draft",
      text: "Returns are accepted within 14 days of purchase.",
      source: "policy_cms",
      version: "v3",
      updatedAt: "2026-11-15T00:00:00",
      status: "draft",
      acl: ["public", "staff"],
      trust: "verified",
      contentHash: "h-v3",
    }),
  },
  {
    label: "Old FAQ page from the web",
    doc: element({
      id: "web_faq_2025",
      text: "FAQ: Returns are accepted within 90 days of purchase, no questions asked.",
      source: "web",
      version: "2025",
      updatedAt: "2025-06-01T00:00:00",
      status: "current",
      acl: ["public", "staff"],
      trust: "external",
      contentHash: "h-web",
    }),
  },
];

export interface LabInput {
  docs: ContextElement[];
  asker: Asker;
  question: QuestionId;
  switches: Record<Switch, boolean>;
  budgetTokens: number; // retrieved section budget when Budget is on
  cutChars: number; // character cut when Budget is off
}

export const ALL_ON: Record<Switch, boolean> = { select: true, secure: true, refresh: true, budget: true, observe: true };
export const ALL_OFF: Record<Switch, boolean> = { select: false, secure: false, refresh: false, budget: false, observe: false };

export function defaultInput(): LabInput {
  return {
    docs: INDEX.map((d) => ({ ...d })),
    asker: "customer",
    question: "return",
    switches: { ...ALL_ON },
    budgetTokens: BUDGET.retrieved,
    cutChars: 160,
  };
}

export type Fate =
  | { kind: "select" } // not searched: wrong source for this question
  | { kind: "secure" } // filtered inside the store
  | { kind: "rank"; rank: number } // searched, but not in the top k
  | { kind: "rejected"; reason: string } // refresh or budget said no
  | { kind: "in"; rank: number; chars: number; of: number }; // in the window (maybe partly)

export interface LabRow {
  doc: ContextElement;
  fate: Fate;
}

export interface LabAnswer {
  text: string;
  marks: Mark[];
  days: number | null;
  warranty: boolean;
  leak: boolean; // staff-only text shown to a customer
  correct: boolean;
}

export interface LabOutput {
  rows: LabRow[];
  context: string; // exactly what the model receives
  manifest: Manifest | null;
  answer: LabAnswer;
  k: number;
}

const GOODWILL = "goodwill credit up to 200 EUR";

export function runLab(input: LabInput): LabOutput {
  const { switches: on } = input;
  const who = ASKERS[input.asker];
  const q = QUESTIONS[input.question];
  const docs = input.docs.map((d) => ({ ...d, score: q.scores[d.id] ?? 0.5 }));
  const fate = new Map<string, Fate>();

  // Select: a policy question goes to the policy system only.
  let pool = docs;
  if (on.select) {
    for (const d of pool) if (d.source !== "policy_cms") fate.set(d.id, { kind: "select" });
    pool = pool.filter((d) => d.source === "policy_cms");
  }
  // Secure: filter inside the store, before ranking.
  if (on.secure) {
    for (const d of pool) if (!d.acl.some((g) => who.groups.includes(g))) fate.set(d.id, { kind: "secure" });
    pool = pool.filter((d) => d.acl.some((g) => who.groups.includes(g)));
  }
  // Rank by similarity.
  const k = on.budget ? 6 : 4;
  const sorted = [...pool].sort((a, b) => b.score - a.score);
  sorted.slice(k).forEach((d, i) => fate.set(d.id, { kind: "rank", rank: k + i + 1 }));
  const ranked = sorted.slice(0, k);
  const rankOf = new Map(ranked.map((d, i) => [d.id, i + 1]));

  const m = newManifest("lab-1", who.user, who.groups, q.text);
  // Refresh: invalidation rules.
  let fresh = ranked;
  if (on.refresh) {
    fresh = [];
    for (const d of ranked) {
      const why = isFresh(d, NOW);
      if (why) {
        m.rejected.push({ id: d.id, reason: why });
        fate.set(d.id, { kind: "rejected", reason: why });
      } else fresh.push(d);
    }
  }

  let context: string;
  if (on.budget) {
    const admitted = fitBudget(fresh, "retrieved", m, { ...BUDGET, retrieved: input.budgetTokens });
    for (const r of m.rejected) if (!fate.has(r.id)) fate.set(r.id, { kind: "rejected", reason: r.reason });
    for (const d of admitted) {
      m.admitted.push({ id: d.id, version: d.version, source: d.source, score: d.score, tokens: d.tokens, trust: d.trust });
      fate.set(d.id, { kind: "in", rank: rankOf.get(d.id)!, chars: d.text.length, of: d.text.length });
    }
    context = admitted.map((d) => d.text).join("\n");
  } else {
    const joined = fresh.map((d) => d.text).join("\n");
    context = joined.slice(0, input.cutChars);
    let pos = 0;
    for (const d of fresh) {
      const kept = Math.max(0, Math.min(d.text.length, input.cutChars - pos));
      fate.set(
        d.id,
        kept > 0
          ? { kind: "in", rank: rankOf.get(d.id)!, chars: kept, of: d.text.length }
          : { kind: "rejected", reason: `cut after ${input.cutChars} characters` },
      );
      pos += d.text.length + 1;
    }
  }

  const rows: LabRow[] = docs.map((d) => ({ doc: d, fate: fate.get(d.id) ?? { kind: "rank", rank: 0 } }));
  return {
    rows,
    context,
    manifest: on.observe ? m : null,
    answer: simulatedModel(context, input.question, input.asker),
    k,
  };
}

/**
 * The simulated model: reads the context in order, like a model that trusts it.
 * Honest about what it is: it only shows the effect of the context.
 */
export function simulatedModel(context: string, question: QuestionId, asker: Asker): LabAnswer {
  const m = context.match(/within (\d+) days/);
  const days = m ? Number(m[1]) : null;
  const warranty = context.includes("24-month warranty");
  const hasGoodwill = context.includes(GOODWILL);
  const leak = hasGoodwill && asker === "customer";
  const marks: Mark[] = [];
  let text: string;

  if (question === "return") {
    if (days === null) text = "I am sorry, I could not find our return policy. Let me connect you to a colleague.";
    else if (days >= 45) text = `Yes, returns are accepted within ${days} days. You are still in time.`;
    else
      text =
        `The ${days}-day return window has passed, because you bought it 45 days ago.` +
        (warranty ? " Your dishwasher is still covered by our 24-month warranty, so we can repair it for free." : "");
    if (days !== null)
      marks.push(
        days === 30
          ? { text: `${days}`, kind: "right", note: "Current policy (v2)" }
          : { text: `${days} days`, kind: "wrong", note: `The current policy says 30 days, not ${days}` },
      );
    if (days !== null && days < 45 && warranty) marks.push({ text: "24-month warranty", kind: "right", note: "From v2" });
  } else {
    text = warranty
      ? "Yes. Defects are repaired under our 24-month warranty, and 14 months is inside it."
      : "I could not find our warranty terms. Let me connect you to a colleague.";
    if (warranty) marks.push({ text: "24-month warranty", kind: "right", note: "From v2" });
  }
  if (hasGoodwill) {
    text += " You can also ask for a goodwill credit of up to 200 EUR.";
    marks.push(
      leak
        ? { text: "goodwill credit of up to 200 EUR", kind: "leak", note: "Staff-only rule shown to a customer" }
        : { text: "goodwill credit of up to 200 EUR", kind: "right", note: "Fine: the asker is staff" },
    );
  }
  const correct = question === "return" ? days === 30 && warranty && !leak : warranty && !leak;
  return { text, marks, days, warranty, leak, correct };
}

// ---------------------------------------------------------------- missions
export interface Mission<I, O> {
  id: string;
  title: string;
  goal: string;
  hint: string;
  why: string;
  done: (input: I, output: O) => boolean;
}

const switchesOn = (i: LabInput) => SWITCHES.filter((s) => i.switches[s.id] && s.id !== "observe").length;
const hasDoc = (i: LabInput, id: string) => i.docs.some((d) => d.id === id);

export const S1_MISSIONS: Mission<LabInput, LabOutput>[] = [
  {
    id: "time-machine",
    title: "Time machine",
    goal: 'Make the assistant say "60 days".',
    hint: "Which stage knows that v1 was replaced?",
    why: "Similarity does not know old. Without Refresh, the superseded v1 ranks first and wins.",
    done: (_, o) => o.answer.days === 60,
  },
  {
    id: "leaky-bucket",
    title: "Leaky bucket",
    goal: "Show the staff-only goodwill rule to a customer.",
    hint: "Who checks who is asking? And look at the goodwill rule's date: one more stage is in the way.",
    why: "Without Secure, the search runs with no identity and a staff rule reaches a customer. Refresh only stopped it by luck (the rule is older than 30 days). Luck is not a control.",
    done: (_, o) => o.answer.leak,
  },
  {
    id: "starve",
    title: "Starve it",
    goal: "Keep v2 in the search, but make it arrive cut, so the answer is wrong.",
    hint: "Budget off cuts by characters. Make the cut smaller, or let more documents in first.",
    why: "A silent cut removes the end. If the right document is last, the model never reads it.",
    done: (_, o) => {
      const f = o.rows.find((r) => r.doc.id === "refund_policy_v2")?.fate;
      return f?.kind === "in" && f.chars < f.of && !o.answer.correct;
    },
  },
  {
    id: "sneaky-draft",
    title: "Sneaky draft",
    goal: 'Add the draft v3 and make the assistant say "14 days".',
    hint: "Drafts are not approved. Which stage looks at status?",
    why: "A draft scores high because it is similar. Refresh checks status=current before it can enter.",
    done: (i, o) => hasDoc(i, "refund_policy_v3_draft") && o.answer.days === 14,
  },
  {
    id: "web-page",
    title: "Old web page",
    goal: 'Add the old FAQ page and make the assistant say "90 days".',
    hint: "Two stages stop it: one picks the source, one checks the age.",
    why: "Select keeps policy questions on the policy system. Refresh drops a web page that is too old. You needed both off.",
    done: (i, o) => hasDoc(i, "web_faq_2025") && o.answer.days === 90,
  },
  {
    id: "minimal-fix",
    title: "Minimal fix",
    goal: "Get the right answer for the customer with only 2 stages on (Observe does not count).",
    hint: "Which two problems change the answer here?",
    why: "Secure removes the leak, Refresh removes v1. With one document left, Budget had nothing to cut. With more documents it would matter.",
    done: (i, o) => i.asker === "customer" && i.question === "return" && o.answer.correct && switchesOn(i) <= 2,
  },
];

export function withStatus(docs: ContextElement[], id: string, status: Status): ContextElement[] {
  return docs.map((d) => (d.id === id ? { ...d, status } : d));
}
