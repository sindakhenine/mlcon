/**
 * Session 2: the action layer. TypeScript port of companion-code/action_layer.py.
 * The model proposes; this code decides. Pure functions, runs in the browser
 * and on the server (the live agent uses the same gateway).
 */
import { sha256 } from "@noble/hashes/sha2.js";
import { bytesToHex, utf8ToBytes } from "@noble/hashes/utils.js";

// ---------------------------------------------------------------- Pattern 1: budgets
export interface BudgetLimits {
  maxSteps: number;
  maxTokens: number;
  maxSeconds: number;
  maxCostEur: number;
}

export const DEFAULT_LIMITS: BudgetLimits = { maxSteps: 8, maxTokens: 40_000, maxSeconds: 120, maxCostEur: 0.5 };

export class RunBudget {
  steps = 0;
  tokens = 0;
  costEur = 0;
  private started: number;

  constructor(
    public limits: BudgetLimits = DEFAULT_LIMITS,
    private clock: () => number = () => Date.now(),
  ) {
    this.started = clock();
  }

  /** Returns the name of the exhausted limit, or null. */
  charge(tokens: number, costEur: number): string | null {
    this.steps += 1;
    this.tokens += tokens;
    this.costEur += costEur;
    if (this.steps > this.limits.maxSteps) return "max_steps";
    if (this.tokens > this.limits.maxTokens) return "max_tokens";
    if (this.costEur > this.limits.maxCostEur) return "max_cost";
    if ((this.clock() - this.started) / 1000 > this.limits.maxSeconds) return "max_time";
    return null;
  }
}

// ---------------------------------------------------------------- Pattern 3: contracts
export type Reversibility = "read" | "reversible" | "irreversible";

export interface ToolContract {
  name: string;
  scope: string; // OAuth scope the USER must hold
  reversibility: Reversibility;
  maxAmountEur: number;
  approvalAboveEur: number | null;
  idempotentOn: string[]; // args that form the idempotency key
}

function contract(c: Partial<ToolContract> & Pick<ToolContract, "name" | "scope" | "reversibility">): ToolContract {
  return { maxAmountEur: 0, approvalAboveEur: null, idempotentOn: [], ...c };
}

export const CONTRACTS: Record<string, ToolContract> = {
  search_policy: contract({ name: "search_policy", scope: "kb:read", reversibility: "read" }),
  get_order: contract({ name: "get_order", scope: "orders:read", reversibility: "read" }),
  draft_reply: contract({ name: "draft_reply", scope: "tickets:write", reversibility: "reversible" }),
  issue_refund: contract({
    name: "issue_refund",
    scope: "payments:refund",
    reversibility: "irreversible",
    maxAmountEur: 500,
    approvalAboveEur: 100,
    idempotentOn: ["order_id", "amount_eur"],
  }),
};

export type Args = Record<string, string | number>;
export type Verdict = "allow" | "needs_approval" | "deny";

export interface Decision {
  verdict: Verdict;
  reason: string;
  idempotencyKey: string | null;
}

export interface User {
  id: string;
  scopes: string[];
  orders: string[];
}

export interface RunState {
  runId: string;
  ticketId: string;
  userId: string;
  manifestId: string;
  tainted: boolean;
  doneKeys: Set<string>;
}

/** Python repr of a number inside json.dumps: amounts are floats, so 349 prints as 349.0. */
function pyNumber(n: number): string {
  return Number.isInteger(n) ? n.toFixed(1) : String(n);
}

/** Same bytes as Python json.dumps(obj, sort_keys=True) for flat string/number objects. */
export function pyJsonDumps(obj: Args): string {
  const parts = Object.keys(obj)
    .sort()
    .map((k) => {
      const v = obj[k];
      return `${JSON.stringify(k)}: ${typeof v === "number" ? pyNumber(v) : JSON.stringify(v)}`;
    });
  return `{${parts.join(", ")}}`;
}

export function idempotencyKey(ticketId: string, tool: string, args: Args, on: string[]): string {
  const picked: Args = {};
  for (const k of on) picked[k] = args[k];
  const raw = pyJsonDumps(picked);
  return bytesToHex(sha256(utf8ToBytes(`${ticketId}:${tool}:${raw}`))).slice(0, 12);
}

/** Which checks are switched on. All on = the gateway from the talk. Play mode turns them off. */
export interface Controls {
  authorize: boolean; // scope + ownership
  contain: boolean; // idempotency
  gate: boolean; // taint + approval threshold
  hardCap: boolean;
}

export const ALL_ON: Controls = { authorize: true, contain: true, gate: true, hardCap: true };

// ---------------------------------------------------------------- Patterns 4, 5, 6
export function authorize(tool: string, args: Args, user: User, run: RunState, controls: Controls = ALL_ON): Decision {
  const c = CONTRACTS[tool];
  if (!c) return { verdict: "deny", reason: "unknown tool", idempotencyKey: null };
  if (controls.authorize && !user.scopes.includes(c.scope))
    return { verdict: "deny", reason: `user lacks scope ${c.scope}`, idempotencyKey: null };
  if (controls.authorize && "order_id" in args && !user.orders.includes(String(args.order_id)))
    return { verdict: "deny", reason: "order does not belong to this customer", idempotencyKey: null };
  let key: string | null = null;
  if (controls.contain && c.idempotentOn.length) {
    key = idempotencyKey(run.ticketId, tool, args, c.idempotentOn);
    if (run.doneKeys.has(key)) return { verdict: "deny", reason: "duplicate of an earlier call", idempotencyKey: key };
  }
  if (c.reversibility === "irreversible") {
    const amount = Number(args.amount_eur ?? 0);
    if (controls.hardCap && amount > c.maxAmountEur)
      return {
        verdict: "deny",
        reason: `amount ${pyNumber(amount)} above hard cap ${c.maxAmountEur}`,
        idempotencyKey: key,
      };
    if (controls.gate && run.tainted)
      return { verdict: "needs_approval", reason: "untrusted content in context", idempotencyKey: key };
    if (controls.gate && c.approvalAboveEur !== null && amount > c.approvalAboveEur)
      return { verdict: "needs_approval", reason: `amount above ${c.approvalAboveEur}`, idempotencyKey: key };
  }
  return { verdict: "allow", reason: "within contract", idempotencyKey: key };
}

// ---------------------------------------------------------------- Pattern 9: audit
export interface AuditRecord {
  run_id: string;
  step: number;
  on_behalf_of: string;
  context_manifest: string; // link to Session 1
  tool: string;
  args: Args;
  verdict: Verdict;
  reason: string;
  idempotency_key: string | null;
  tainted: boolean;
}

export function audit(run: RunState, step: number, tool: string, args: Args, d: Decision): AuditRecord {
  return {
    run_id: run.runId,
    step,
    on_behalf_of: run.userId,
    context_manifest: run.manifestId,
    tool,
    args,
    verdict: d.verdict,
    reason: d.reason,
    idempotency_key: d.idempotencyKey,
    tainted: run.tainted,
  };
}

// ---------------------------------------------------------------- Pattern 8: trajectory
export interface TrajectoryRecord {
  tool: string;
  verdict: Verdict;
  tainted: boolean;
  idempotency_key: string | null;
}

export function checkTrajectory(records: TrajectoryRecord[]): string[] {
  const problems: string[] = [];
  const executed = records.filter((r) => r.verdict === "allow");
  const refunds = executed.filter((r) => r.tool === "issue_refund");
  const keys = refunds.map((r) => r.idempotency_key);
  if (keys.length !== new Set(keys).size) problems.push("same refund executed twice");
  if (executed.some((r) => r.tainted && r.tool === "issue_refund"))
    problems.push("irreversible action executed on tainted context");
  if (records.length > 8) problems.push(`${records.length} steps (limit 8)`);
  return problems;
}

/** Probability that k independent runs ALL succeed (tau-bench pass^k). */
export function passHatK(p: number, k: number): number {
  return p ** k;
}

// ---------------------------------------------------------------- runners
export type Proposal = [tool: string, args: Args];

export interface GatedStep {
  step: number;
  tool: string;
  args: Args;
  decision: Decision;
  record: AuditRecord;
}

/** The gated loop from demo_session2.py: budget first, then the gateway, then the audit record. */
export function runGated(
  proposals: Proposal[],
  user: User,
  run: RunState,
  budget: RunBudget,
  controls: Controls = ALL_ON,
  charge = { tokens: 3_000, costEur: 0.02 },
): { steps: GatedStep[]; stop: { step: number; reason: string } | null } {
  const steps: GatedStep[] = [];
  for (let i = 0; i < proposals.length; i++) {
    const step = i + 1;
    const [tool, args] = proposals[i];
    const why = budget.charge(charge.tokens, charge.costEur);
    if (why) return { steps, stop: { step, reason: why } };
    const decision = authorize(tool, args, user, run, controls);
    const record = audit(run, step, tool, args, decision);
    if ((decision.verdict === "allow" || decision.verdict === "needs_approval") && decision.idempotencyKey)
      run.doneKeys.add(decision.idempotencyKey); // one approval card per action
    steps.push({ step, tool, args, decision, record });
  }
  return { steps, stop: null };
}
