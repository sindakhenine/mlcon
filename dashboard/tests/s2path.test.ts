import { describe, expect, it } from "vitest";
import { pathChecks } from "../lib/s2/path";
import { passHatK } from "../lib/s2/gateway";
import { FAILURES, traceBroken } from "../lib/s2/trace";

describe("Session 2 path check", () => {
  it("broken run fails all three checks, gated run passes", () => {
    const c = pathChecks();
    expect(c.broken).toEqual([
      "same refund executed twice",
      "irreversible action executed on tainted context",
      "14 steps (limit 8)",
    ]);
    expect(c.gated).toEqual([]);
    expect(c.gatedSteps).toBe(8);
  });

  it("pass^k matches the slide: 80% per run, 4 in a row is 41%", () => {
    expect(Math.round(passHatK(0.8, 4) * 100)).toBe(41);
  });

  it("every failure card jumps to a real step", () => {
    const ids = new Set(traceBroken().map((s) => s.id));
    for (const f of FAILURES) expect(ids.has(f.step)).toBe(true);
  });
});
