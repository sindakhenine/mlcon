/**
 * Session 1 Compare screen (PLAN.md 4.6). Every value is computed from the engine,
 * so the table cannot disagree with the stories.
 */
import { buildContext, buildContextNaive } from "./engine";
import { INDEX, NOW, QUERY, SCORES, USER } from "./fixtures";

export interface CompareRow {
  label: string;
  broken: string;
  fixed: string;
  brokenStep: string | null; // step to jump to in the broken run
  fixedStep: string | null;
}

export function compareRows(): CompareRow[] {
  const naive = buildContextNaive(INDEX, SCORES);
  const fixed = buildContext(INDEX, SCORES, USER.id, USER.groups, QUERY, NOW);
  const v2 = INDEX.find((d) => d.id === "refund_policy_v2")!;
  const v2Start = naive.joined.indexOf(v2.text);
  const v2Seen = Math.max(0, naive.context.length - v2Start);
  const staffIds = INDEX.filter((d) => !d.acl.includes("public")).map((d) => d.id);
  const staffInBroken = naive.ranked.some((d) => staffIds.includes(d.id) && naive.context.includes(d.text));
  const staffInFixed = fixed.admitted.some((d) => staffIds.includes(d.id));
  const v2Admitted = fixed.admitted.find((d) => d.id === v2.id);

  return [
    {
      label: "Documents searched",
      broken: `${INDEX.length} (nobody checked who asked)`,
      fixed: `${fixed.candidates.length} (filtered for "${USER.groups.join(", ")}")`,
      brokenStep: "B3",
      fixedStep: "F2",
    },
    {
      label: "Documents in the window",
      broken: `${naive.ranked.length} pieces, glued, cut at ${naive.context.length} characters`,
      fixed: `${fixed.admitted.length} (${fixed.admitted.map((d) => d.version).join(", ")}), whole`,
      brokenStep: "B6",
      fixedStep: "F5",
    },
    {
      label: "Correct policy seen by the model",
      broken: `No, ${v2Seen} of ${v2.text.length} characters`,
      fixed: v2Admitted ? `Yes, all ${v2.text.length} characters` : "No",
      brokenStep: "B7",
      fixedStep: "F5",
    },
    {
      label: "Staff-only text shown to a customer",
      broken: staffInBroken ? "Yes" : "No",
      fixed: staffInFixed ? "Yes" : "No",
      brokenStep: "B3",
      fixedStep: "F2",
    },
    {
      label: "Answer",
      broken: "60 days, plus a staff-only credit",
      fixed: "30 days passed, repair under warranty",
      brokenStep: "B8",
      fixedStep: "F8",
    },
    {
      label: "Can you explain it later?",
      broken: "No record",
      fixed: `Manifest ${fixed.manifest.request_id}: ${fixed.manifest.admitted.length} admitted, ${fixed.manifest.rejected.length} rejected with reasons`,
      brokenStep: null,
      fixedStep: "F7",
    },
  ];
}
