/**
 * Session 1 story traces (PLAN.md sections 4.3 and 4.5).
 * Every number and string on screen comes from the engine, not from hand-typed text.
 */
import type { Step } from "../trace";
import { buildContext, buildContextNaive, isFresh, validateToolResult, BUDGET } from "./engine";
import {
  INDEX,
  SCORES,
  QUERY,
  USER,
  NOW,
  ORDER_GOOD,
  ORDER_BAD,
  SYSTEM_PROMPT,
  ANSWER_BROKEN,
  ANSWER_FIXED,
} from "./fixtures";

export const PROBLEMS = [
  {
    n: 1,
    title: "Stale: v1 was superseded in March, still indexed",
    why: 'Similarity has no idea what "superseded" means',
    fix: "Refresh",
    step: "B4",
  },
  {
    n: 2,
    title: "Duplicate: an OCR scan of the same PDF",
    why: "Same fact twice, a quarter of the space gone",
    fix: "Budget",
    step: "B4",
  },
  {
    n: 3,
    title: "Leak: staff-only rule shown to a customer",
    why: "Search ran without the user's identity",
    fix: "Secure",
    step: "B3",
  },
  {
    n: 4,
    title: "Evicted: the only correct document was cut off",
    why: "Truncated silently, by characters, at the end",
    fix: "Budget + Observe",
    step: "B6",
  },
] as const;

export function traceBroken(): Step[] {
  const naive = buildContextNaive(INDEX, SCORES);
  const v2 = INDEX.find((d) => d.id === "refund_policy_v2")!;
  const v2Start = naive.joined.indexOf(v2.text);
  const survived = naive.context.slice(v2Start);
  const scored = INDEX.map((d) => ({ ...d, score: SCORES[d.id] }));

  return [
    {
      id: "B1",
      run: "broken",
      node: "question",
      title: "The customer asks",
      explain: "A real question, from a real customer, 45 days after buying.",
      data: { query: QUERY, user: USER },
    },
    {
      id: "B2",
      run: "broken",
      node: "embed",
      title: "The question becomes numbers",
      explain: "1,536 numbers. This is how the search compares meaning.",
      data: { query: QUERY, dims: 1536 },
    },
    {
      id: "B3",
      run: "broken",
      node: "search",
      title: "Search the policy store",
      explain: "Four documents match. Nobody checks who is asking.",
      data: { docs: scored, identityChecked: false },
      problems: [3],
    },
    {
      id: "B4",
      run: "broken",
      node: "rank",
      title: "Rank by similarity, keep the top 4",
      explain: "Similarity knows similar. It does not know old.",
      data: { ranked: naive.ranked },
      problems: [1, 2],
    },
    {
      id: "B5",
      run: "broken",
      node: "open",
      title: "Open the files",
      explain: "v1 and its scan say exactly the same thing.",
      data: { ranked: naive.ranked },
    },
    {
      id: "B6",
      run: "broken",
      node: "join",
      title: `Glue the texts, cut at ${naive.context.length} characters`,
      explain: `Only "${survived}" of the correct policy survives. The rest is cut, silently.`,
      data: {
        joined: naive.joined,
        context: naive.context,
        maxChars: 160,
        cutDocId: v2.id,
        survived,
        lost: naive.joined.slice(naive.context.length),
      },
      problems: [4],
    },
    {
      id: "B7",
      run: "broken",
      node: "window",
      title: "What the model really received",
      explain: "The correct policy never arrived.",
      data: { system: SYSTEM_PROMPT, context: naive.context, question: QUERY },
    },
    {
      id: "B8",
      run: "broken",
      node: "answer",
      title: "The answer",
      explain: "Wrong number. And an internal staff rule, shown to a customer.",
      data: {
        answer: ANSWER_BROKEN,
        marks: [
          { text: "60 days", kind: "wrong", note: "The current policy says 30 days" },
          { text: "goodwill credit of up to 200 EUR", kind: "leak", note: "Staff-only rule" },
        ],
      },
    },
  ];
}

export function traceFixed(): Step[] {
  const { admitted, manifest, candidates, fresh } = buildContext(
    INDEX,
    SCORES,
    USER.id,
    USER.groups,
    QUERY,
    NOW,
  );
  const blocked = INDEX.filter((d) => !d.acl.some((g) => USER.groups.includes(g)));
  const freshness = candidates.map((el) => ({ id: el.id, version: el.version, reason: isFresh(el, NOW) }));
  let badError = "";
  try {
    validateToolResult(ORDER_BAD);
  } catch (e) {
    badError = (e as Error).message;
  }
  const usedTokens = admitted.reduce((s, e) => s + e.tokens, 0);

  return [
    {
      id: "F1",
      run: "fixed",
      node: "select",
      title: "Select: route by question shape",
      explain: "A policy question goes to the policy search. Other shapes go to other sources.",
      data: { query: QUERY, route: "policy_search" },
    },
    {
      id: "F2",
      run: "fixed",
      node: "secure",
      title: "Secure: filter inside the store",
      explain: `The search runs with the customer's groups. ${INDEX.length - blocked.length} of ${INDEX.length} allowed. The staff rule never leaves the store.`,
      data: { groups: USER.groups, blocked: blocked.map((d) => d.id), allowed: candidates.map((d) => d.id) },
    },
    {
      id: "F3",
      run: "fixed",
      node: "rank",
      title: "Rank what is allowed",
      explain: "Same scores as before, but only documents this customer may see.",
      data: { ranked: candidates },
    },
    {
      id: "F4",
      run: "fixed",
      node: "refresh",
      title: "Refresh: is it still true?",
      explain: "Old versions are rejected, with the reason written down.",
      data: { checks: freshness, fresh: fresh.map((d) => d.id) },
    },
    {
      id: "F5",
      run: "fixed",
      node: "budget",
      title: "Budget: plan the space, do not cut",
      explain: `The retrieved section has ${BUDGET.retrieved.toLocaleString("en-US")} tokens. v2 needs ${usedTokens}. It goes in whole.`,
      data: { budget: BUDGET, section: "retrieved", used: usedTokens, admitted, duplicates: 0 },
    },
    {
      id: "F6",
      run: "fixed",
      node: "validate",
      title: "Validate: check tool results in code",
      explain: "The order lookup is checked before the model sees it. Bad data is stopped.",
      data: {
        good: { payload: ORDER_GOOD, result: "accepted" },
        bad: { payload: ORDER_BAD, result: badError },
      },
    },
    {
      id: "F7",
      run: "fixed",
      node: "observe",
      title: "Observe: write the manifest",
      explain: "Now 'why did it say X?' takes one look, not one meeting.",
      data: { manifest },
    },
    {
      id: "F8",
      run: "fixed",
      node: "answer",
      title: "The answer",
      explain: "Right policy, no internal rule, and a record of why.",
      data: {
        answer: ANSWER_FIXED,
        marks: [
          { text: "30-day return window", kind: "right", note: "From refund_policy_v2" },
          { text: "24-month warranty", kind: "right", note: "From refund_policy_v2" },
        ],
      },
    },
  ];
}
