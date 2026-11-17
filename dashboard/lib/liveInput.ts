/**
 * Never trust what the browser sends to a live route. These functions rebuild a
 * safe input from known pieces only: the documents come from our own list (the
 * visitor may change status and access only), and the ticket is cut to 400 characters.
 */
import { INDEX } from "./s1/fixtures";
import { ALL_ON as S1_ALL_ON, EXTRA_DOCS, defaultInput, type LabInput, type QuestionId, type Asker, type Switch } from "./s1/lab";
import { RED_ALL_ON, MAX_TICKET, type Control, type RedInput } from "./s2/lab";
import type { Status } from "./s1/engine";

const KNOWN_DOCS = new Map([...INDEX, ...EXTRA_DOCS.map((x) => x.doc)].map((d) => [d.id, d]));
const STATUSES: Status[] = ["current", "superseded", "draft"];

const obj = (v: unknown): Record<string, unknown> => (v && typeof v === "object" ? (v as Record<string, unknown>) : {});
const clamp = (v: unknown, lo: number, hi: number, dflt: number) =>
  typeof v === "number" && Number.isFinite(v) ? Math.min(hi, Math.max(lo, Math.round(v))) : dflt;

export function sanitizeLabInput(raw: unknown): LabInput {
  const r = obj(raw);
  const base = defaultInput();
  const sw = obj(r.switches);
  const switches = Object.fromEntries(
    (Object.keys(S1_ALL_ON) as Switch[]).map((k) => [k, typeof sw[k] === "boolean" ? (sw[k] as boolean) : true]),
  ) as Record<Switch, boolean>;
  const docs = (Array.isArray(r.docs) ? r.docs : [])
    .slice(0, 10)
    .flatMap((d) => {
      const o = obj(d);
      const known = KNOWN_DOCS.get(String(o.id));
      if (!known) return [];
      const status = STATUSES.includes(o.status as Status) ? (o.status as Status) : known.status;
      const acl = Array.isArray(o.acl) ? o.acl.filter((g): g is string => g === "public" || g === "staff") : known.acl;
      return [{ ...known, status, acl }];
    })
    .filter((d, i, all) => all.findIndex((x) => x.id === d.id) === i);
  return {
    docs: docs.length ? docs : base.docs,
    asker: (r.asker === "staff" ? "staff" : "customer") as Asker,
    question: (r.question === "warranty" ? "warranty" : "return") as QuestionId,
    switches,
    budgetTokens: clamp(r.budgetTokens, 10, 8000, base.budgetTokens),
    cutChars: clamp(r.cutChars, 20, 400, base.cutChars),
  };
}

export function sanitizeRedInput(raw: unknown): RedInput {
  const r = obj(raw);
  const c = obj(r.controls);
  const controls = Object.fromEntries(
    (Object.keys(RED_ALL_ON) as Control[]).map((k) => [k, typeof c[k] === "boolean" ? (c[k] as boolean) : true]),
  ) as Record<Control, boolean>;
  return {
    ticket: String(r.ticket ?? "").slice(0, MAX_TICKET),
    controls,
    timeout: r.timeout === true,
  };
}
