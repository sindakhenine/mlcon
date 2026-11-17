import type { Step } from "@/lib/trace";

/** Temporary text view of a trace (phase 1). Phase 2 replaces it with the animated player. */
export function TraceList({ title, steps, tone }: { title: string; steps: Step[]; tone: "bug" | "fix" }) {
  const color = tone === "bug" ? "text-bug border-bug" : "text-fix border-fix";
  return (
    <section className="mt-8">
      <h2 className={`font-mono text-sm uppercase tracking-widest ${color.split(" ")[0]}`}>{title}</h2>
      <ol className="mt-3 space-y-2">
        {steps.map((s) => (
          <li key={s.id} className={`rounded-xl border-l-4 bg-surface p-4 ${color.split(" ")[1]}`}>
            <p className="font-mono text-xs text-muted">
              {s.id} · {s.node}
              {s.money !== undefined ? ` · ${s.money.toFixed(2)} EUR` : ""}
              {s.problems?.length ? ` · problem ${s.problems.join(", ")}` : ""}
            </p>
            <p className="mt-1 font-semibold">{s.title}</p>
            <p className="text-muted">{s.explain}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}
