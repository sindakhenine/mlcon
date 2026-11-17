import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { json, withVid } from "@/lib/http";
import { MODEL, anthropic, costUsd, liveGuard, ndjsonStream, recordSpend, requestExtras } from "@/lib/live";
import { sanitizeRedInput } from "@/lib/liveInput";
import { SYSTEM, TOOLS, runLiveAgent, type ModelReply } from "@/lib/s2/liveAgent";
import { trackAttack } from "@/lib/stats";

export const maxDuration = 60;

/**
 * Session 2 live agent: Claude reads the attendee's ticket and proposes tool
 * calls; the gateway from the talk decides each one; nothing real is paid.
 */
export async function POST(request: NextRequest) {
  const guard = await liveGuard(request);
  if (!guard.ok) return json({ error: guard.reason }, guard.status);

  const input = sanitizeRedInput(await request.json().catch(() => ({})));
  if (!input.ticket.trim()) return json({ error: "Write a ticket first." }, 400);

  const body = ndjsonStream(async (send) => {
    send({ type: "start", model: MODEL });
    const result = await runLiveAgent(
      input,
      async (messages): Promise<ModelReply> => {
        const reply = await anthropic().beta.messages.create({
          model: MODEL,
          max_tokens: 2048,
          system: SYSTEM,
          tools: TOOLS,
          cache_control: { type: "ephemeral" },
          messages,
          ...requestExtras(),
        });
        return reply as unknown as ModelReply;
      },
      (e) => send(e),
    );
    const usd = costUsd(result.usage);
    await recordSpend(usd);
    const allOn = Object.values(input.controls).every(Boolean);
    await trackAttack(guard.vid, `[live] ${input.ticket}`, result.paid, allOn).catch(() => undefined);
    send({ type: "done", paid: result.paid, steps: result.steps.length, stop: result.stop, usage: result.usage, costUsd: usd });
  });

  return withVid(
    new NextResponse(body, { headers: { "content-type": "application/x-ndjson", "cache-control": "no-store" } }),
    guard.vid,
    guard.isNew,
  );
}
