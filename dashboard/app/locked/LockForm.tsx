"use client";

import { useSearch } from "@/lib/useSearch";

/** Plain HTML form: works even before JavaScript loads. The query string only adds the error line. */
export function LockForm() {
  const q = useSearch();
  const raw = q.get("next") ?? "/";
  const next = raw.startsWith("/") && !raw.startsWith("//") ? raw : "/";
  return (
    <form method="POST" action="/api/unlock" className="mt-6 flex flex-col gap-3">
      <input type="hidden" name="next" value={next} />
      <label htmlFor="code" className="text-sm font-medium">
        Access code
      </label>
      <input
        id="code"
        name="code"
        type="password"
        autoComplete="off"
        autoFocus
        required
        className="rounded-lg border border-line bg-bg px-4 py-3 font-mono text-lg outline-none focus:border-brand"
      />
      {q.get("error") === "1" && <p className="text-sm text-bug">That code is not right.</p>}
      <button type="submit" className="mt-2 rounded-lg bg-brand px-4 py-3 font-semibold text-bg transition hover:opacity-90">
        Open
      </button>
    </form>
  );
}
