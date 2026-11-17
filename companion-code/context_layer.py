"""Session 1: the context layer.

Everything that ENTERS the model's context window goes through this file.
Pure Python, no LLM and no vector database, so every step is visible.
Run demo_session1.py to see the broken pipeline and the fixed one side by side.
"""
from __future__ import annotations

import json
from dataclasses import dataclass, field, asdict
from datetime import datetime, timedelta


# ---------------------------------------------------------------------------
# Pattern 2: a context element is a typed record, not a string
# ---------------------------------------------------------------------------
@dataclass
class ContextElement:
    id: str
    text: str
    source: str            # system of record: "policy_cms", "crm", "web"
    version: str
    updated_at: datetime
    status: str            # "current" | "superseded" | "draft"
    acl: set[str]          # groups allowed to see it
    trust: str             # "system" | "verified" | "user" | "external"
    content_hash: str      # duplicate detection
    score: float = 0.0     # similarity from retrieval
    tokens: int = 0

    def __post_init__(self):
        self.tokens = self.tokens or max(1, len(self.text) // 4)


# How long each kind of source stays valid (Pattern 4: freshness)
TTL = {
    "price_api": timedelta(minutes=15),
    "crm": timedelta(hours=1),
    "policy_cms": timedelta(days=30),   # plus: superseded docs are tombstoned
}


@dataclass
class Manifest:
    """Pattern 8: what entered the window, and what did not, and why."""
    request_id: str
    user: str
    groups: list[str]
    query: str
    admitted: list[dict] = field(default_factory=list)
    rejected: list[dict] = field(default_factory=list)

    def reject(self, el: ContextElement, reason: str):
        self.rejected.append({"id": el.id, "reason": reason})

    def admit(self, el: ContextElement):
        self.admitted.append({"id": el.id, "version": el.version,
                              "source": el.source, "score": el.score,
                              "tokens": el.tokens, "trust": el.trust})

    def to_json(self) -> str:
        return json.dumps(asdict(self), indent=2, default=str)


# ---------------------------------------------------------------------------
# Pattern 3: permissions are a filter BEFORE ranking, not after
# ---------------------------------------------------------------------------
def retrieve(index: list[ContextElement], query_vec_scores: dict[str, float],
             groups: set[str], k: int = 4) -> list[ContextElement]:
    allowed = [e for e in index if e.acl & groups]           # filter first
    for e in allowed:
        e.score = query_vec_scores.get(e.id, 0.0)
    return sorted(allowed, key=lambda e: e.score, reverse=True)[:k]


# ---------------------------------------------------------------------------
# Pattern 4: freshness is an invalidation rule, not a re-embedding schedule
# ---------------------------------------------------------------------------
def is_fresh(el: ContextElement, now: datetime) -> str | None:
    if el.status != "current":
        return f"status={el.status}"
    age = now - el.updated_at
    if age > TTL.get(el.source, timedelta(days=1)):
        return "ttl_expired"
    return None


# ---------------------------------------------------------------------------
# Pattern 5: the window is a budget; every eviction is logged
# ---------------------------------------------------------------------------
BUDGET = {"system": 1500, "tools": 1000, "retrieved": 8000, "memory": 600,
          "history": 1200}


def fit_budget(elements: list[ContextElement], section: str,
               m: Manifest) -> list[ContextElement]:
    keep, used, seen = [], 0, set()
    for el in elements:                              # already ranked
        if el.content_hash in seen:
            m.reject(el, "duplicate"); continue
        if used + el.tokens > BUDGET[section]:
            m.reject(el, f"budget:{section}"); continue
        seen.add(el.content_hash)
        keep.append(el); used += el.tokens
    return keep


# ---------------------------------------------------------------------------
# Pattern 7: tool results are untrusted input; validate in code
# ---------------------------------------------------------------------------
ORDER_SCHEMA = {"order_id": str, "purchased_on": str, "amount_eur": float}


def validate_tool_result(payload: dict) -> dict:
    for key, typ in ORDER_SCHEMA.items():
        if not isinstance(payload.get(key), typ):
            raise ValueError(f"tool result rejected: {key} missing or not {typ.__name__}")
    if not (0 < payload["amount_eur"] < 10_000):
        raise ValueError("tool result rejected: amount_eur out of bounds")
    return payload


# ---------------------------------------------------------------------------
# The whole read path
# ---------------------------------------------------------------------------
def build_context(index, scores, user, groups, query, now, request_id="req-1"):
    m = Manifest(request_id, user, sorted(groups), query)
    candidates = retrieve(index, scores, set(groups), k=6)
    fresh = []
    for el in candidates:
        why = is_fresh(el, now)
        if why:
            m.reject(el, why)
        else:
            fresh.append(el)
    admitted = fit_budget(fresh, "retrieved", m)
    for el in admitted:
        m.admit(el)
    return admitted, m


def build_context_naive(index, scores, query, k=4, max_chars=160):
    """What most demos ship: rank everything, glue strings, cut at N characters."""
    ranked = sorted(index, key=lambda e: scores.get(e.id, 0), reverse=True)[:k]
    ctx = "\n".join(e.text for e in ranked)
    return ctx[:max_chars], ranked
