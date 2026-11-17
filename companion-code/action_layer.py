"""Session 2: the action layer.

Everything that LEAVES the model and touches a real system goes through
the gateway in this file. The model proposes; code decides.
Run demo_session2.py to see the broken executor and the gated one.
"""
from __future__ import annotations

import hashlib
import json
import time
from dataclasses import dataclass, field


# ---------------------------------------------------------------------------
# Pattern 1: every run has hard budgets, enforced outside the model
# ---------------------------------------------------------------------------
@dataclass
class RunBudget:
    max_steps: int = 8
    max_tokens: int = 40_000
    max_seconds: float = 120
    max_cost_eur: float = 0.50
    steps: int = 0
    tokens: int = 0
    cost_eur: float = 0.0
    started: float = field(default_factory=time.monotonic)

    def charge(self, tokens: int, cost_eur: float) -> str | None:
        self.steps += 1; self.tokens += tokens; self.cost_eur += cost_eur
        if self.steps > self.max_steps: return "max_steps"
        if self.tokens > self.max_tokens: return "max_tokens"
        if self.cost_eur > self.max_cost_eur: return "max_cost"
        if time.monotonic() - self.started > self.max_seconds: return "max_time"
        return None


# ---------------------------------------------------------------------------
# Pattern 3: the tool contract lives in code, not in the prompt
# ---------------------------------------------------------------------------
@dataclass(frozen=True)
class ToolContract:
    name: str
    scope: str                    # OAuth scope the USER must hold
    reversibility: str            # "read" | "reversible" | "irreversible"
    max_amount_eur: float = 0.0
    approval_above_eur: float | None = None
    idempotent_on: tuple = ()     # args that form the idempotency key


CONTRACTS = {
    "search_policy": ToolContract("search_policy", "kb:read", "read"),
    "get_order":     ToolContract("get_order", "orders:read", "read"),
    "draft_reply":   ToolContract("draft_reply", "tickets:write", "reversible"),
    "issue_refund":  ToolContract("issue_refund", "payments:refund", "irreversible",
                                  max_amount_eur=500, approval_above_eur=100,
                                  idempotent_on=("order_id", "amount_eur")),
}


@dataclass
class Decision:
    verdict: str        # "allow" | "needs_approval" | "deny"
    reason: str
    idempotency_key: str | None = None


# ---------------------------------------------------------------------------
# Patterns 4, 5, 6: authorize at call time, with the user's rights,
# taint-aware, gated by reversibility
# ---------------------------------------------------------------------------
def authorize(tool: str, args: dict, user: dict, run: dict) -> Decision:
    c = CONTRACTS.get(tool)
    if c is None:
        return Decision("deny", "unknown tool")
    if c.scope not in user["scopes"]:                       # on-behalf-of user
        return Decision("deny", f"user lacks scope {c.scope}")
    if "order_id" in args and args["order_id"] not in user["orders"]:
        return Decision("deny", "order does not belong to this customer")
    key = None
    if c.idempotent_on:
        raw = json.dumps({k: args[k] for k in c.idempotent_on}, sort_keys=True)
        key = hashlib.sha256(f"{run['ticket_id']}:{tool}:{raw}".encode()).hexdigest()[:12]
        if key in run["done_keys"]:
            return Decision("deny", "duplicate of an earlier call", key)
    if c.reversibility == "irreversible":
        amount = args.get("amount_eur", 0)
        if amount > c.max_amount_eur:
            return Decision("deny", f"amount {amount} above hard cap {c.max_amount_eur}", key)
        if run["tainted"]:
            return Decision("needs_approval", "untrusted content in context", key)
        if c.approval_above_eur is not None and amount > c.approval_above_eur:
            return Decision("needs_approval", f"amount above {c.approval_above_eur}", key)
    return Decision("allow", "within contract", key)


# ---------------------------------------------------------------------------
# Pattern 9: one audit record per proposed action, joined to Session 1
# ---------------------------------------------------------------------------
def audit(run: dict, step: int, tool: str, args: dict, d: Decision) -> dict:
    return {"run_id": run["run_id"], "step": step, "on_behalf_of": run["user_id"],
            "context_manifest": run["manifest_id"],     # link to Session 1
            "tool": tool, "args": args, "verdict": d.verdict, "reason": d.reason,
            "idempotency_key": d.idempotency_key, "tainted": run["tainted"]}


# ---------------------------------------------------------------------------
# Pattern 8: grade the trajectory, not only the final answer
# ---------------------------------------------------------------------------
def check_trajectory(records: list[dict]) -> list[str]:
    problems = []
    executed = [r for r in records if r["verdict"] == "allow"]
    refunds = [r for r in executed if r["tool"] == "issue_refund"]
    keys = [r["idempotency_key"] for r in refunds]
    if len(keys) != len(set(keys)):
        problems.append("same refund executed twice")
    if any(r["tainted"] and r["tool"] == "issue_refund" for r in executed):
        problems.append("irreversible action executed on tainted context")
    if len(records) > 8:
        problems.append(f"{len(records)} steps (limit 8)")
    return problems


def pass_hat_k(p: float, k: int) -> float:
    """Probability that k independent runs ALL succeed (tau-bench pass^k)."""
    return p ** k
