import type { Metadata } from "next";
import Link from "next/link";
import { S2Page } from "@/components/s2/S2Page";

export const metadata: Metadata = {
  title: "Session 2: From answering to acting",
  description: "Same agent, now it can pay. Watch 827 EUR leave, and the gateway that stops it.",
};

export default function Session2() {
  return (
    <main className="mx-auto w-full max-w-[1500px] px-4 py-5 sm:px-6">
      <header className="mb-5 flex flex-wrap items-baseline gap-x-4 gap-y-1">
        <Link href="/" className="text-sm text-brand">← Home</Link>
        <p className="font-mono text-xs uppercase tracking-widest text-fix">Session 2</p>
        <h1 className="text-xl font-semibold sm:text-2xl">Same agent. Now it can act.</h1>
        <p className="ml-auto hidden text-sm text-muted md:block">→ next · ← back · P play · R restart</p>
      </header>
      <S2Page />
    </main>
  );
}
