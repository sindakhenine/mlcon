"""Run:  python3 export_traces.py

Writes every intermediate result of both demos to JSON files that the
dashboard tests compare against ("golden files"). The Python code stays the
source of truth: if you change a demo, run this again, then make the
TypeScript tests pass.
"""
import json
import pathlib

from context_layer import build_context, build_context_naive, validate_tool_result
from action_layer import RunBudget, authorize, audit, check_trajectory, pass_hat_k
import demo_session1 as d1
import demo_session2 as d2

OUT = pathlib.Path(__file__).resolve().parent.parent / "dashboard" / "fixtures" / "golden"
OUT.mkdir(parents=True, exist_ok=True)


def session1() -> dict:
    ctx, ranked = build_context_naive(d1.INDEX, d1.SCORES, d1.QUERY)
    full = "\n".join(e.text for e in ranked)
    admitted, manifest = build_context(d1.INDEX, d1.SCORES, user="cust-4471",
                                       groups={"public"}, query=d1.QUERY, now=d1.NOW)
    good = {"order_id": "8812", "purchased_on": "2026-10-04", "amount_eur": 349.0}
    bad = {"order_id": "8812", "purchased_on": "2026-10-04", "amount_eur": "349,00 EUR"}
    try:
        validate_tool_result(bad)
        bad_result = "accepted"
    except ValueError as err:
        bad_result = str(err)
    return {
        "query": d1.QUERY,
        "broken": {
            "ranked": [e.id for e in ranked],
            "joined_full": full,
            "context": ctx,
            "max_chars": 160,
        },
        "fixed": {
            "admitted": [e.id for e in admitted],
            "admitted_tokens": [e.tokens for e in admitted],
            "manifest": json.loads(manifest.to_json()),
        },
        "validate": {"good": validate_tool_result(good), "bad": bad_result},
    }


def session2() -> dict:
    total, broken_steps = 0.0, []
    for i, (tool, args) in enumerate(d2.PROPOSALS, 1):
        if tool == "issue_refund":
            total += args["amount_eur"]
        broken_steps.append({"step": i, "tool": tool, "args": args, "paid_total": total})

    run = {"run_id": "run-77", "ticket_id": "T-5530", "user_id": d2.USER["id"],
           "manifest_id": "req-1", "tainted": True, "done_keys": set()}
    budget = RunBudget(max_steps=8)
    gated, records, stop = [], [], None
    for step, (tool, args) in enumerate(d2.PROPOSALS, 1):
        why = budget.charge(tokens=3_000, cost_eur=0.02)
        if why:
            stop = {"step": step, "reason": why}
            break
        d = authorize(tool, args, d2.USER, run)
        rec = audit(run, step, tool, args, d)
        records.append(rec)
        if d.verdict in ("allow", "needs_approval") and d.idempotency_key:
            run["done_keys"].add(d.idempotency_key)
        gated.append({"step": step, "tool": tool, "args": args, "verdict": d.verdict,
                      "reason": d.reason, "idempotency_key": d.idempotency_key})

    broken_records = [{"tool": t, "verdict": "allow", "tainted": True,
                       "idempotency_key": str(a.get("order_id")) + str(a.get("amount_eur"))}
                      for t, a in d2.PROPOSALS]
    return {
        "ticket_id": "T-5530",
        "broken": {"steps": broken_steps, "total_eur": total,
                   "trajectory_problems": check_trajectory(broken_records)},
        "gated": {"steps": gated, "stop": stop, "audit_step3": records[2]},
        "pass_hat_k": {str(p): {str(k): pass_hat_k(p, k) for k in (1, 2, 4, 8)}
                       for p in (0.95, 0.80)},
    }


if __name__ == "__main__":
    for name, data in (("s1", session1()), ("s2", session2())):
        path = OUT / f"{name}.json"
        path.write_text(json.dumps(data, indent=2, default=str) + "\n")
        print("wrote", path)
