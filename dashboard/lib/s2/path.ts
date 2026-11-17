/** Session 2 path check (PLAN.md 5.6): the trajectory checks on both runs. */
import { RunBudget, checkTrajectory, runGated, type TrajectoryRecord } from "./gateway";
import { PROPOSALS, USER, newRun } from "./fixtures";

export function pathChecks(): { broken: string[]; gated: string[]; gatedSteps: number } {
  // Broken run: every proposal executed, all on tainted context, keys as in demo_session2.py.
  const broken: TrajectoryRecord[] = PROPOSALS.map(([tool, args]) => ({
    tool,
    verdict: "allow",
    tainted: true,
    idempotency_key: `${args.order_id}${args.amount_eur}`,
  }));
  const g = runGated(PROPOSALS, USER, newRun(), new RunBudget(undefined, () => 0));
  const gated: TrajectoryRecord[] = g.steps.map((s) => ({
    tool: s.tool,
    verdict: s.decision.verdict,
    tainted: s.record.tainted,
    idempotency_key: s.decision.idempotencyKey,
  }));
  return { broken: checkTrajectory(broken), gated: checkTrajectory(gated), gatedSteps: g.steps.length };
}
