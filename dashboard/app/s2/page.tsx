import Link from "next/link";
import { traceBroken, traceGated } from "@/lib/s2/trace";
import { TraceList } from "../_components/TraceList";

export default function Session2() {
  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-10 sm:px-8">
      <Link href="/" className="text-sm text-brand">← Home</Link>
      <h1 className="mt-4 text-3xl font-semibold">Session 2: same agent, now it can act</h1>
      <p className="mt-2 text-muted">Draft view. The animated story comes in the next build phase.</p>
      <TraceList title="Broken agent" steps={traceBroken()} tone="bug" />
      <TraceList title="Through the gateway" steps={traceGated()} tone="fix" />
    </main>
  );
}
