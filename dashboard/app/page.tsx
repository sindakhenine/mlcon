import Link from "next/link";

const sessions = [
  {
    href: "/s1",
    tag: "Session 1",
    title: "Context engineering",
    line: "Same model, same prompt, wrong answer. See what the AI really received.",
    accent: "text-bug",
  },
  {
    href: "/s2",
    tag: "Session 2",
    title: "From answering to acting",
    line: "Same agent, now it can pay. See 827 EUR leave, and the gateway that stops it.",
    accent: "text-fix",
  },
];

export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col px-4 py-12 sm:px-8 sm:py-20">
      <p className="font-mono text-sm uppercase tracking-widest text-muted">MLCon Berlin 2026</p>
      <h1 className="mt-3 text-4xl font-semibold tracking-tight sm:text-6xl">
        From context to action
      </h1>
      <p className="mt-4 max-w-2xl text-lg text-muted">
        An X-ray of an AI support agent. Watch it fail, find the four problems, and see the fixed
        pipeline give the right answer.
      </p>

      <div className="mt-10 grid gap-5 sm:grid-cols-2">
        {sessions.map((s) => (
          <Link
            key={s.href}
            href={s.href}
            className="group rounded-2xl border border-line bg-surface p-6 transition hover:-translate-y-0.5 hover:border-brand"
          >
            <p className={`font-mono text-sm uppercase tracking-widest ${s.accent}`}>{s.tag}</p>
            <h2 className="mt-2 text-2xl font-semibold">{s.title}</h2>
            <p className="mt-2 text-muted">{s.line}</p>
            <p className="mt-6 text-sm font-medium text-brand">Open the demo →</p>
          </Link>
        ))}
      </div>

      <footer className="mt-auto pt-16 text-sm text-muted">
        Sinda Khenine, Creator of SKatalyst AI. Acme Home is a fictional company. Simulated systems,
        no real money.
      </footer>
    </main>
  );
}
