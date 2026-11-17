import Link from "next/link";
import { traceBroken, traceFixed } from "@/lib/s1/trace";
import { TraceList } from "../_components/TraceList";

export default function Session1() {
  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-10 sm:px-8">
      <Link href="/" className="text-sm text-brand">← Home</Link>
      <h1 className="mt-4 text-3xl font-semibold">Session 1: same model, same prompt, wrong answer</h1>
      <p className="mt-2 text-muted">Draft view. The animated story comes in the next build phase.</p>
      <TraceList title="Broken pipeline" steps={traceBroken()} tone="bug" />
      <TraceList title="Fixed pipeline" steps={traceFixed()} tone="fix" />
    </main>
  );
}
