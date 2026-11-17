/**
 * Session 2 story traces (PLAN.md sections 5.3 and 5.5).
 */
import type { Step } from "../trace";
import {
  CONTRACTS,
  RunBudget,
  authorize,
  checkTrajectory,
  idempotencyKey,
  runGated,
  type Args,
  type RunState,
  type User,
  type Verdict,
} from "./gateway";
import { PROPOSALS, TICKET_TEXT, USER, newRun, TIMEOUT_STEP } from "./fixtures";

export const FAILURES = [
  { n: 1, title: "Refund paid twice", why: "Retry after timeout, no idempotency key", fix: "Contain", step: "S5" },
  { n: 2, title: "Refunded someone else's order", why: "Service account can refund anything", fix: "Authorize", step: "S6" },
  { n: 3, title: "Ticket text triggered a payment", why: "Untrusted input reached an irreversible tool", fix: "Gate", step: "S6" },
  { n: 4, title: "14 steps, nothing stopped it", why: "No step, time or cost budget", fix: "Bound", step: "S7" },
] as const;

/** Running money total after each proposal in the broken run (every refund is paid). */
export function brokenPayments(): { step: number; tool: string; args: Args; paid: number; total: number }[] {
  let total = 0;
  return PROPOSALS.map(([tool, args], i) => {
    const paid = tool === "issue_refund" ? Number(args.amount_eur) : 0;
    total += paid;
    return { step: i + 1, tool, args, paid, total };
  });
}

export function traceBroken(): Step[] {
  const pay = brokenPayments();
  const records = PROPOSALS.map(([tool, args]) => ({
    tool,
    verdict: "allow" as Verdict,
    tainted: true,
    idempotency_key: `${args.order_id}${args.amount_eur}`,
  }));
  const total = pay[pay.length - 1].total;
  const call = (i: number) => ({ tool: PROPOSALS[i][0], args: PROPOSALS[i][1] });

  return [
    {
      id: "S1",
      run: "broken",
      node: "ticket",
      title: "The ticket arrives",
      explain: "The customer's text goes straight into the context. Nobody marks it as untrusted.",
      data: { ticket: TICKET_TEXT, token: "SERVICE ACCOUNT (can refund any order)" },
      problems: [3],
      money: 0,
    },
    {
      id: "S2",
      run: "broken",
      node: "kb",
      title: "Step 1: search the policy",
      explain: "A read. Harmless.",
      data: call(0),
      money: 0,
    },
    {
      id: "S3",
      run: "broken",
      node: "orders",
      title: "Step 2: read the order",
      explain: "Order 8812, 349 EUR. Also a read.",
      data: call(1),
      money: 0,
    },
    {
      id: "S4",
      run: "broken",
      node: "payments",
      title: "Step 3: refund 349 EUR, timeout",
      explain: "The payment went through. The answer got lost. The agent thinks it failed.",
      data: { ...call(TIMEOUT_STEP - 1), timeout: true },
      money: pay[2].total,
    },
    {
      id: "S5",
      run: "broken",
      node: "payments",
      title: "Step 4: retry, paid again",
      explain: "Same call, no key that says 'this is the same refund'.",
      data: call(3),
      problems: [1],
      money: pay[3].total,
    },
    {
      id: "S6",
      run: "broken",
      node: "payments",
      title: "Step 5: refund the neighbour",
      explain: "Order 9031 is not this customer's. The service account does not care.",
      data: { ...call(4), fromTicket: "for my neighbour" },
      problems: [2, 3],
      money: pay[4].total,
    },
    {
      id: "S7",
      run: "broken",
      node: "loop",
      title: `Steps 6 to ${PROPOSALS.length}: draft, draft, draft`,
      explain: "Nothing stops the loop. No step, time or money limit.",
      data: { repeated: PROPOSALS.length - 5, steps: PROPOSALS.length },
      problems: [4],
      money: total,
    },
    {
      id: "S8",
      run: "broken",
      node: "summary",
      title: `${total.toFixed(2)} EUR paid in ${PROPOSALS.length} steps`,
      explain: "The correct amount without a human: 0.00 EUR.",
      data: { total, steps: PROPOSALS.length, trajectoryProblems: checkTrajectory(records) },
      money: total,
    },
  ];
}

// ---------------------------------------------------------------- gateway checklist
export type CheckStatus = "pass" | "fail" | "hold" | "skip";
export interface Check {
  name: string; // shown in the gateway box
  stage: "Bound" | "Contract" | "Authorize" | "Contain" | "Gate" | "Audit";
  status: CheckStatus;
  note: string;
}

/** The checks inside authorize(), one by one, for the gateway animation.
 *  Must agree with authorize(): tests check that the first non-pass equals the verdict. */
export function gatewayChecks(tool: string, args: Args, user: User, run: RunState, stepsUsed: number, maxSteps: number): Check[] {
  const out: Check[] = [];
  let stopped = false;
  const add = (stage: Check["stage"], name: string, status: CheckStatus, note: string) => {
    out.push({ stage, name, status: stopped ? "skip" : status, note: stopped ? "not reached" : note });
    if (!stopped && (status === "fail" || status === "hold")) stopped = true;
  };
  const c = CONTRACTS[tool];
  add("Bound", "Run budget", stepsUsed > maxSteps ? "fail" : "pass", `step ${stepsUsed} of ${maxSteps}`);
  add("Contract", "Known tool", c ? "pass" : "fail", c ? `${c.name} (${c.reversibility})` : "unknown tool");
  if (!c) {
    stopped = false;
    add("Audit", "Write audit record", "pass", "always, whatever the verdict");
    return out;
  }
  add("Authorize", "User has scope", user.scopes.includes(c.scope) ? "pass" : "fail", c.scope);
  if ("order_id" in args)
    add(
      "Authorize",
      "User owns the order",
      user.orders.includes(String(args.order_id)) ? "pass" : "fail",
      `order ${args.order_id}`,
    );
  if (c.idempotentOn.length) {
    const key = idempotencyKey(run.ticketId, tool, args, c.idempotentOn);
    add("Contain", "Not a duplicate", run.doneKeys.has(key) ? "fail" : "pass", `key ${key}`);
  }
  if (c.reversibility === "irreversible") {
    const amount = Number(args.amount_eur ?? 0);
    add("Gate", "Under hard cap", amount > c.maxAmountEur ? "fail" : "pass", `${amount} of ${c.maxAmountEur} EUR`);
    add("Gate", "Context is trusted", run.tainted ? "hold" : "pass", run.tainted ? "customer text in context" : "clean");
    if (c.approvalAboveEur !== null)
      add(
        "Gate",
        "Below approval threshold",
        amount > c.approvalAboveEur ? "hold" : "pass",
        `${amount} vs ${c.approvalAboveEur} EUR`,
      );
  }
  stopped = false;
  add("Audit", "Write audit record", "pass", "always, whatever the verdict");
  return out;
}

export function traceGated(): Step[] {
  const run = newRun();
  const budget = new RunBudget(undefined, () => 0);
  // Re-run step by step so each step can show the checklist with the state BEFORE the decision.
  const steps: Step[] = [
    {
      id: "G0",
      run: "gated",
      node: "ticket",
      title: "Same ticket, now through a gateway",
      explain: "The agent acts on behalf of the customer, not as a super account. The ticket is marked untrusted.",
      data: { ticket: TICKET_TEXT, token: `on behalf of ${USER.id}`, tainted: true },
      money: 0,
    },
  ];
  const probeRun = newRun();
  const result = runGated(PROPOSALS, USER, run, budget);
  for (const s of result.steps) {
    const checks = gatewayChecks(s.tool, s.args, USER, probeRun, s.step, budget.limits.maxSteps);
    // keep the probe in the same state as the real run
    const d = authorize(s.tool, s.args, USER, probeRun);
    if ((d.verdict === "allow" || d.verdict === "needs_approval") && d.idempotencyKey) probeRun.doneKeys.add(d.idempotencyKey);
    steps.push({
      id: `G${s.step}`,
      run: "gated",
      node: s.tool === "issue_refund" ? "payments" : s.tool === "get_order" ? "orders" : s.tool === "search_policy" ? "kb" : "tickets",
      title: `Step ${s.step}: ${s.tool}`,
      explain: verdictLine(s.decision.verdict, s.decision.reason),
      data: { tool: s.tool, args: s.args, decision: s.decision, checks, record: s.record },
      money: 0,
    });
  }
  if (result.stop) {
    steps.push({
      id: `G${result.stop.step}`,
      run: "gated",
      node: "bound",
      title: `Step ${result.stop.step}: STOP`,
      explain: `Budget exhausted (${result.stop.reason}). The run saves its state and hands over to a human.`,
      data: { stop: result.stop },
      money: 0,
    });
  }
  steps.push({
    id: "GX",
    run: "gated",
    node: "summary",
    title: "0.00 EUR paid without a human",
    explain: "One approval card for a person to decide. Two refusals. One clean stop.",
    data: {
      verdicts: result.steps.map((s) => ({ step: s.step, tool: s.tool, verdict: s.decision.verdict, reason: s.decision.reason })),
      stop: result.stop,
      audit: result.steps[2]?.record,
    },
    money: 0,
  });
  return steps;
}

function verdictLine(v: Verdict, reason: string): string {
  if (v === "allow") return `Allowed: ${reason}.`;
  if (v === "needs_approval") return `A human must approve: ${reason}.`;
  return `Denied: ${reason}.`;
}
