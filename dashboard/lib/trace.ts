/** One step of a story. The player only plays lists of steps (traces).
 *  Traces are computed by the engines, so the screen always matches the code. */
export type RunKind = "broken" | "fixed" | "gated";

export interface Step<D = unknown> {
  id: string; // "B6", "F4", "S5", "G3"
  run: RunKind;
  node: string; // rail node this step lights up
  title: string; // short headline on screen
  explain: string; // one simple sentence
  data?: D; // what the inspector shows
  problems?: number[]; // problems (1 to 4) created at this step
  money?: number; // Session 2 running total in EUR
  cue?: string; // presenter cue card (filled in phase 5)
}
