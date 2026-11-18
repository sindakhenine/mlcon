import { describe, expect, it } from "vitest";
import { CUES } from "../lib/cues";
import { traceBroken as b1, traceFixed as f1, PROBLEMS } from "../lib/s1/trace";
import { traceBroken as b2, traceGated as g2, FAILURES } from "../lib/s2/trace";
import { compareRows } from "../lib/s1/compare";

describe("cue cards", () => {
  it("every step of every screen has a cue", () => {
    const ids = [
      ...b1().map((s) => s.id),
      ...PROBLEMS.map((p) => `P${p.n}`),
      "P5",
      ...f1().map((s) => s.id),
      ...compareRows().map((_, i) => `C${i + 1}`),
      "C7",
      ...b2().map((s) => s.id),
      ...FAILURES.map((f) => `X${f.n}`),
      "X5",
      ...g2().map((s) => s.id),
      "T1",
      "T2",
      "T3",
    ];
    expect(ids.filter((id) => !CUES[id])).toEqual([]);
  });

  it("no em dashes in what the speaker reads", () => {
    expect(Object.values(CUES).filter((c) => c.includes("—"))).toEqual([]);
  });
});
