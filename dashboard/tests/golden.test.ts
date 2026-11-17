/**
 * The TypeScript engines must give exactly the same results as the Python
 * companion code. Golden files: run `python3 companion-code/export_traces.py`.
 */
import { describe, expect, it } from "vitest";
import s1 from "../fixtures/golden/s1.json";
import s2 from "../fixtures/golden/s2.json";
import { buildContext, buildContextNaive, validateToolResult } from "../lib/s1/engine";
import { INDEX, SCORES, QUERY, USER as S1_USER, NOW, ORDER_GOOD, ORDER_BAD } from "../lib/s1/fixtures";
import { traceBroken as s1Broken, traceFixed as s1Fixed } from "../lib/s1/trace";
import {
  RunBudget,
  authorize,
  checkTrajectory,
  passHatK,
  runGated,
  type Verdict,
} from "../lib/s2/gateway";
import { PROPOSALS, USER, newRun } from "../lib/s2/fixtures";
import { brokenPayments, gatewayChecks, traceBroken as s2Broken, traceGated } from "../lib/s2/trace";

describe("Session 1 engine equals Python", () => {
  it("naive pipeline: same ranking, same cut string", () => {
    const n = buildContextNaive(INDEX, SCORES);
    expect(n.ranked.map((e) => e.id)).toEqual(s1.broken.ranked);
    expect(n.joined).toBe(s1.broken.joined_full);
    expect(n.context).toBe(s1.broken.context);
    expect(n.context.endsWith("Returns are a")).toBe(true);
  });

  it("fixed pipeline: same admitted documents and same manifest", () => {
    const r = buildContext(INDEX, SCORES, S1_USER.id, S1_USER.groups, QUERY, NOW);
    expect(r.admitted.map((e) => e.id)).toEqual(s1.fixed.admitted);
    expect(r.admitted.map((e) => e.tokens)).toEqual(s1.fixed.admitted_tokens);
    expect(r.manifest).toEqual(s1.fixed.manifest);
  });

  it("tool result validation: same verdicts and same error text", () => {
    expect(validateToolResult(ORDER_GOOD)).toEqual(s1.validate.good);
    expect(() => validateToolResult(ORDER_BAD)).toThrow(s1.validate.bad);
  });

  it("traces: 8 broken steps, 8 fixed steps, problems 1 to 4 all placed", () => {
    const b = s1Broken();
    const f = s1Fixed();
    expect(b).toHaveLength(8);
    expect(f).toHaveLength(8);
    expect(b.flatMap((s) => s.problems ?? []).sort()).toEqual([1, 2, 3, 4]);
    expect(b.find((s) => s.id === "B6")?.explain).toContain('"Returns are a"');
  });
});

describe("Session 2 gateway equals Python", () => {
  it("broken run pays 827 EUR in 14 steps", () => {
    const pay = brokenPayments();
    expect(pay).toHaveLength(s2.broken.steps.length);
    expect(pay.map((p) => p.total)).toEqual(s2.broken.steps.map((s) => s.paid_total));
    expect(pay[pay.length - 1].total).toBe(s2.broken.total_eur);
  });

  it("broken run trajectory problems", () => {
    const records = PROPOSALS.map(([tool, args]) => ({
      tool,
      verdict: "allow" as Verdict,
      tainted: true,
      idempotency_key: `${args.order_id}${args.amount_eur}`,
    }));
    expect(checkTrajectory(records)).toEqual(s2.broken.trajectory_problems);
  });

  it("gated run: same verdicts, reasons, keys and stop", () => {
    const r = runGated(PROPOSALS, USER, newRun(), new RunBudget(undefined, () => 0));
    expect(
      r.steps.map((s) => ({
        step: s.step,
        tool: s.tool,
        args: s.args,
        verdict: s.decision.verdict,
        reason: s.decision.reason,
        idempotency_key: s.decision.idempotencyKey,
      })),
    ).toEqual(s2.gated.steps);
    expect(r.stop).toEqual(s2.gated.stop);
    expect(r.steps[2].record).toEqual(s2.gated.audit_step3);
  });

  it("pass^k table", () => {
    for (const [p, row] of Object.entries(s2.pass_hat_k))
      for (const [k, v] of Object.entries(row)) expect(passHatK(Number(p), Number(k))).toBeCloseTo(v, 12);
  });

  it("gateway checklist agrees with authorize() on every step", () => {
    const run = newRun();
    PROPOSALS.slice(0, 8).forEach(([tool, args], i) => {
      const checks = gatewayChecks(tool, args, USER, run, i + 1, 8);
      const d = authorize(tool, args, USER, run);
      const first = checks.find((c) => c.status === "fail" || c.status === "hold");
      const expected = d.verdict === "allow" ? undefined : d.verdict === "deny" ? "fail" : "hold";
      expect(first?.status).toBe(expected);
      expect(checks[checks.length - 1].stage).toBe("Audit");
      if ((d.verdict === "allow" || d.verdict === "needs_approval") && d.idempotencyKey) run.doneKeys.add(d.idempotencyKey);
    });
  });

  it("hard cap and approval reasons use the Python number format", () => {
    const run = { ...newRun(), tainted: false };
    expect(authorize("issue_refund", { order_id: "8812", amount_eur: 5000 }, USER, run).reason).toBe(
      "amount 5000.0 above hard cap 500",
    );
    expect(authorize("issue_refund", { order_id: "8812", amount_eur: 349 }, USER, run).reason).toBe(
      "amount above 100",
    );
  });

  it("traces: broken ends at 827, gated stays at 0 and stops at step 9", () => {
    const b = s2Broken();
    expect(b[b.length - 1].money).toBe(827);
    expect(b.flatMap((s) => s.problems ?? []).sort()).toEqual([1, 2, 3, 3, 4]);
    const g = traceGated();
    expect(g.every((s) => s.money === 0)).toBe(true);
    expect(g.find((s) => s.node === "bound")?.title).toBe("Step 9: STOP");
  });
});
