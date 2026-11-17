"""Run:  python3 demo_session1.py

A customer asks the Acme Home support agent:
"Can I return my dishwasher? I bought it 45 days ago."
The current policy says 30 days. The old one said 60.
"""
from datetime import datetime
from context_layer import (ContextElement, build_context, build_context_naive,
                           validate_tool_result)

NOW = datetime(2026, 11, 18, 10, 0)

INDEX = [
    ContextElement("refund_policy_v1", "Returns are accepted within 60 days of purchase.",
                   "policy_cms", "v1", datetime(2026, 2, 1), "superseded",
                   {"public", "staff"}, "verified", "h-v1"),
    ContextElement("refund_policy_v1_scan", "Returns are accepted within 60 days of purchase.",
                   "policy_cms", "v1", datetime(2026, 2, 1), "superseded",
                   {"public", "staff"}, "verified", "h-v1"),
    ContextElement("goodwill_guidelines", "Staff may grant a goodwill credit up to 200 EUR.",
                   "policy_cms", "v3", datetime(2026, 10, 1), "current",
                   {"staff"}, "verified", "h-gw"),
    ContextElement("refund_policy_v2", "Returns are accepted within 30 days of purchase. "
                   "After 30 days, defects are repaired under the 24-month warranty.",
                   "policy_cms", "v2", datetime(2026, 11, 1), "current",
                   {"public", "staff"}, "verified", "h-v2"),
]

# Similarity scores as a vector index would return them for this query.
SCORES = {"refund_policy_v1": 0.91, "refund_policy_v1_scan": 0.90,
          "goodwill_guidelines": 0.86, "refund_policy_v2": 0.83}

QUERY = "Can I return my dishwasher? I bought it 45 days ago."

if __name__ == "__main__":
    print("=" * 70)
    print("BROKEN: rank everything, join strings, cut at 160 characters")
    print("=" * 70)
    ctx, ranked = build_context_naive(INDEX, SCORES, QUERY)
    for e in ranked:
        print(f"  {e.id:24s} score={SCORES[e.id]:.2f}  status={e.status:10s} acl={sorted(e.acl)}")
    print("\nWhat the model actually sees:\n" + ctx)
    print("\n-> v2 (the only correct document) is cut off. "
          "The customer also sees a staff-only rule.")

    print("\n" + "=" * 70)
    print("FIXED: ACL before ranking, freshness check, dedupe, budget, manifest")
    print("=" * 70)
    admitted, manifest = build_context(INDEX, SCORES, user="cust-4471",
                                       groups={"public"}, query=QUERY, now=NOW)
    for e in admitted:
        print(f"  ADMITTED {e.id} ({e.version})")
    print("\nManifest:")
    print(manifest.to_json())

    print("\n" + "=" * 70)
    print("TOOL RESULT VALIDATION")
    print("=" * 70)
    good = {"order_id": "8812", "purchased_on": "2026-10-04", "amount_eur": 349.0}
    bad = {"order_id": "8812", "purchased_on": "2026-10-04", "amount_eur": "349,00 EUR"}
    print("good ->", validate_tool_result(good))
    try:
        validate_tool_result(bad)
    except ValueError as err:
        print("bad  ->", err)
