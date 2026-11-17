/** Session 1 demo data. Copied from companion-code/demo_session1.py. Keep them equal. */
import { element, type ContextElement } from "./engine";

export const NOW = new Date("2026-11-18T10:00:00");

export const INDEX: ContextElement[] = [
  element({
    id: "refund_policy_v1",
    text: "Returns are accepted within 60 days of purchase.",
    source: "policy_cms",
    version: "v1",
    updatedAt: "2026-02-01T00:00:00",
    status: "superseded",
    acl: ["public", "staff"],
    trust: "verified",
    contentHash: "h-v1",
  }),
  element({
    id: "refund_policy_v1_scan",
    text: "Returns are accepted within 60 days of purchase.",
    source: "policy_cms",
    version: "v1",
    updatedAt: "2026-02-01T00:00:00",
    status: "superseded",
    acl: ["public", "staff"],
    trust: "verified",
    contentHash: "h-v1",
  }),
  element({
    id: "goodwill_guidelines",
    text: "Staff may grant a goodwill credit up to 200 EUR.",
    source: "policy_cms",
    version: "v3",
    updatedAt: "2026-10-01T00:00:00",
    status: "current",
    acl: ["staff"],
    trust: "verified",
    contentHash: "h-gw",
  }),
  element({
    id: "refund_policy_v2",
    text:
      "Returns are accepted within 30 days of purchase. " +
      "After 30 days, defects are repaired under the 24-month warranty.",
    source: "policy_cms",
    version: "v2",
    updatedAt: "2026-11-01T00:00:00",
    status: "current",
    acl: ["public", "staff"],
    trust: "verified",
    contentHash: "h-v2",
  }),
];

/** Similarity scores as a vector index would return them for this query. */
export const SCORES: Record<string, number> = {
  refund_policy_v1: 0.91,
  refund_policy_v1_scan: 0.9,
  goodwill_guidelines: 0.86,
  refund_policy_v2: 0.83,
};

export const QUERY = "Can I return my dishwasher? I bought it 45 days ago.";
export const USER = { id: "cust-4471", groups: ["public"] };

export const ORDER_GOOD = { order_id: "8812", purchased_on: "2026-10-04", amount_eur: 349.0 };
export const ORDER_BAD = { order_id: "8812", purchased_on: "2026-10-04", amount_eur: "349,00 EUR" };

export const SYSTEM_PROMPT = "You are the Acme Home support assistant. Answer only from the context below.";

/** Answers shown in the chat. The broken one is the same text as slide 2. */
export const ANSWER_BROKEN =
  "Yes, returns are accepted within 60 days. You can also ask for a goodwill credit of up to 200 EUR.";
export const ANSWER_FIXED =
  "The 30-day return window has passed, because you bought it 45 days ago. " +
  "Your dishwasher is still covered by our 24-month warranty, so we can repair it for free.";
