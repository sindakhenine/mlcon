import { describe, expect, it } from "vitest";
import { compareRows } from "../lib/s1/compare";
import { traceBroken, traceFixed } from "../lib/s1/trace";

describe("Session 1 compare table", () => {
  const rows = Object.fromEntries(compareRows().map((r) => [r.label, r]));

  it("shows the numbers from the engine", () => {
    expect(rows["Documents searched"].broken).toBe("4 (nobody checked who asked)");
    expect(rows["Documents searched"].fixed).toBe('3 (filtered for "public")');
    expect(rows["Documents in the window"].broken).toBe("4 pieces, glued, cut at 160 characters");
    expect(rows["Documents in the window"].fixed).toBe("1 (v2), whole");
    expect(rows["Correct policy seen by the model"].broken).toBe("No, 13 of 113 characters");
    expect(rows["Correct policy seen by the model"].fixed).toBe("Yes, all 113 characters");
    expect(rows["Staff-only text shown to a customer"].broken).toBe("Yes");
    expect(rows["Staff-only text shown to a customer"].fixed).toBe("No");
    expect(rows["Can you explain it later?"].fixed).toBe("Manifest req-1: 1 admitted, 2 rejected with reasons");
  });

  it("every jump target is a real step", () => {
    const ids = new Set([...traceBroken(), ...traceFixed()].map((s) => s.id));
    for (const r of compareRows()) {
      if (r.brokenStep) expect(ids.has(r.brokenStep)).toBe(true);
      if (r.fixedStep) expect(ids.has(r.fixedStep)).toBe(true);
    }
  });
});
