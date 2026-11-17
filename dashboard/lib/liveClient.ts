"use client";

/** Calls a live route and hands each streamed event (one JSON object per line) to onEvent. */
export async function streamLive(
  url: string,
  body: unknown,
  onEvent: (e: Record<string, unknown>) => void,
): Promise<void> {
  const r = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!r.ok || !r.body) {
    const j = await r.json().catch(() => ({}));
    throw new Error(j.error ?? `The server answered ${r.status}.`);
  }
  const reader = r.body.getReader();
  const dec = new TextDecoder();
  let buf = "";
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += dec.decode(value, { stream: true });
    let nl: number;
    while ((nl = buf.indexOf("\n")) >= 0) {
      const line = buf.slice(0, nl).trim();
      buf = buf.slice(nl + 1);
      if (line) onEvent(JSON.parse(line));
    }
  }
}

export const cents = (usd: number) => (usd < 0.01 ? `${(usd * 100).toFixed(2)} cents` : `${usd.toFixed(3)} USD`);
