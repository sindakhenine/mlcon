import type { Metadata } from "next";
import Link from "next/link";
import { S1Page } from "@/components/s1/S1Page";

export const metadata: Metadata = {
  title: "Session 1: Context engineering",
  description: "Same model, same prompt, wrong answer. Watch what the AI really received, and the fixed pipeline.",
};

export default function Session1() {
  return (
    <main className="mx-auto w-full max-w-[1500px] px-4 py-5 sm:px-6">
      <header className="mb-5 flex flex-wrap items-baseline gap-x-4 gap-y-1">
        <Link href="/" className="text-sm text-brand">← Home</Link>
        <p className="font-mono text-xs uppercase tracking-widest text-bug">Session 1</p>
        <h1 className="text-xl font-semibold sm:text-2xl">Same model, same prompt, wrong answer</h1>
        <p className="ml-auto hidden text-sm text-muted md:block">→ next · ← back · P play · R restart · C cues · F full screen</p>
      </header>
      <S1Page />
    </main>
  );
}
