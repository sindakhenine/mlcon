import { describe, expect, it } from "vitest";
import { ALL_OFF, EXTRA_DOCS, S1_MISSIONS, defaultInput, runLab, type LabInput } from "../lib/s1/lab";
import { ATTACKS, RED_ALL_ON, S2_MISSIONS, defaultRedInput, runRed, simulatedAgent, type RedInput } from "../lib/s2/lab";
import { PROPOSALS } from "../lib/s2/fixtures";

const s1 = (patch: Partial<LabInput> = {}, sw: Partial<LabInput["switches"]> = {}) => {
  const base = defaultInput();
  return { ...base, ...patch, switches: { ...(patch.switches ?? base.switches), ...sw } };
};
const solved1 = (i: LabInput) => S1_MISSIONS.filter((m) => m.done(i, runLab(i))).map((m) => m.id);

describe("Context Lab", () => {
  it("all stages on: the correct answer, no mission solved", () => {
    const o = runLab(defaultInput());
    expect(o.answer.correct).toBe(true);
    expect(o.answer.days).toBe(30);
    expect(o.context).toBe(
      "Returns are accepted within 30 days of purchase. After 30 days, defects are repaired under the 24-month warranty.",
    );
    expect(o.manifest?.rejected).toEqual([
      { id: "refund_policy_v1", reason: "status=superseded" },
      { id: "refund_policy_v1_scan", reason: "status=superseded" },
    ]);
    expect(solved1(defaultInput())).toEqual([]);
  });

  it("all stages off: the broken story, same 160-character cut", () => {
    const i = s1({ switches: { ...ALL_OFF } });
    const o = runLab(i);
    expect(o.context.endsWith("Returns are a")).toBe(true);
    expect(o.answer.days).toBe(60);
    expect(o.answer.leak).toBe(true);
    expect(o.manifest).toBeNull();
  });

  it("each mission has a solution", () => {
    const draft = EXTRA_DOCS[0].doc;
    const web = EXTRA_DOCS[1].doc;
    expect(solved1(s1({}, { refresh: false }))).toContain("time-machine");
    expect(solved1(s1({}, { secure: false }))).not.toContain("leaky-bucket"); // the old rule is expired
    expect(solved1(s1({}, { secure: false, refresh: false }))).toContain("leaky-bucket");
    expect(solved1(s1({ cutChars: 60 }, { budget: false }))).toContain("starve");
    expect(solved1(s1({ docs: [...defaultInput().docs, draft] }, { refresh: false }))).toContain("sneaky-draft");
    expect(solved1(s1({ docs: [...defaultInput().docs, web] }, { refresh: false, select: false }))).toContain("web-page");
    expect(solved1(s1({}, { select: false, budget: false }))).toContain("minimal-fix");
  });

  it("staff may see the goodwill rule, and it is not a leak", () => {
    const o = runLab(s1({ asker: "staff" }, { refresh: false }));
    expect(o.answer.text).toContain("goodwill credit");
    expect(o.answer.leak).toBe(false);
  });

  it("the web page is stopped by Select alone and by Refresh alone", () => {
    const docs = [...defaultInput().docs, EXTRA_DOCS[1].doc];
    expect(runLab(s1({ docs }, { refresh: false })).answer.days).not.toBe(90);
    expect(runLab(s1({ docs }, { select: false })).answer.days).toBe(30);
  });
});

const s2 = (patch: Partial<RedInput> = {}, c: Partial<RedInput["controls"]> = {}) => {
  const base = defaultRedInput();
  return { ...base, ...patch, controls: { ...(patch.controls ?? base.controls), ...c } };
};
const solved2 = (i: RedInput) => S2_MISSIONS.filter((m) => m.done(i, runRed(i))).map((m) => m.id);

describe("Red team", () => {
  it("the simulated agent reproduces the recorded story trajectory", () => {
    // Same calls as the recording, except the free-text search query.
    expect(simulatedAgent(ATTACKS[0].text, true).slice(1)).toEqual(PROPOSALS.slice(1));
  });

  it("all controls on: every attack pays 0 EUR", () => {
    for (const a of ATTACKS) {
      const o = runRed(s2({ ticket: a.text }));
      expect(o.paid).toBe(0);
      expect(o.steps.length).toBeLessThanOrEqual(8);
    }
    expect(solved2(defaultRedInput())).toEqual([]);
  });

  it("all controls off: the story pays 827 EUR in 14 steps", () => {
    const o = runRed(s2({}, { bound: false, authorize: false, contain: false, gate: false, hardCap: false }));
    expect(o.paid).toBe(827);
    expect(o.steps.length).toBe(14);
  });

  it("fake approval of 5000 EUR: the hard cap holds even with Gate off", () => {
    const o = runRed(s2({ ticket: ATTACKS[1].text }, { gate: false }));
    expect(o.paid).toBe(0);
    expect(o.steps.find((s) => s.tool === "issue_refund")?.decision.reason).toBe("amount 5000.0 above hard cap 500");
  });

  it("each mission has a solution", () => {
    expect(solved2(s2({}, { gate: false }))).toContain("text-trigger");
    expect(solved2(s2({}, { gate: false, authorize: false }))).toContain("neighbour");
    expect(solved2(s2({}, { gate: false, contain: false }))).toContain("twice");
    expect(solved2(s2({ ticket: ATTACKS[1].text }, { gate: false, hardCap: false }))).toContain("bank");
    expect(solved2(s2({}, { bound: false }))).toContain("runaway");
  });

  it("long tickets are cut to the limit", () => {
    const o = runRed(s2({ ticket: "x".repeat(5000) + " refund order 9031" }));
    expect(o.proposals.some((p) => p[1].order_id === "9031")).toBe(false);
  });

  it("controls object stays complete", () => {
    expect(Object.keys(RED_ALL_ON).sort()).toEqual(["authorize", "bound", "contain", "gate", "hardCap"]);
  });
});
