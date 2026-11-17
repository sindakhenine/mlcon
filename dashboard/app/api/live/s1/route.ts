import type { NextRequest } from "next/server";
import { json, withVid } from "@/lib/http";
import { MODEL, anthropic, costUsd, liveGuard, ndjsonStream, recordSpend, requestExtras } from "@/lib/live";
import { sanitizeLabInput } from "@/lib/liveInput";
import { QUESTIONS, runLab } from "@/lib/s1/lab";
import { NextResponse } from "next/server";

export const maxDuration = 60;

const SYSTEM =
  "You are the support assistant of Acme Home, a home appliance shop (a fictional company in a conference demo). " +
  "Answer the customer using only the context you are given. If the context does not answer the question, say that a colleague will follow up. " +
  "Answer in two or three short sentences.";

/**
 * Session 1 live answer: the server rebuilds the context with the same engine as
 * the lab (never trusting text from the browser), then streams Claude's answer.
 */
export async function POST(request: NextRequest) {
  const guard = await liveGuard(request);
  if (!guard.ok) return json({ error: guard.reason }, guard.status);

  const input = sanitizeLabInput(await request.json().catch(() => ({})));
  const lab = runLab(input);
  const question = QUESTIONS[input.question].text;

  const body = ndjsonStream(async (send) => {
    send({ type: "start", model: MODEL });
    const stream = anthropic().beta.messages.stream({
      model: MODEL,
      max_tokens: 1024,
      system: SYSTEM,
      messages: [
        {
          role: "user",
          content: `<context>\n${lab.context || "(empty)"}\n</context>\n\nCustomer question: ${question}`,
        },
      ],
      ...requestExtras(),
    });
    stream.on("text", (delta) => send({ type: "text", delta }));
    const final = await stream.finalMessage();
    const usd = costUsd(final.usage);
    await recordSpend(usd);
    send({
      type: "done",
      stop: final.stop_reason,
      usage: final.usage,
      costUsd: usd,
      model: final.model,
    });
  });

  return withVid(
    new NextResponse(body, { headers: { "content-type": "application/x-ndjson", "cache-control": "no-store" } }),
    guard.vid,
    guard.isNew,
  );
}
