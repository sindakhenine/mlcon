/**
 * Cue cards for the speaker (press C on stage). What to say at each step, in short
 * simple sentences, taken from the speech script (_build/scripts.py). Step ids are
 * unique across both sessions.
 */
export const CUES: Record<string, string> = {
  // ---------------------------------------------------------------- Session 1, broken run
  B1: "A customer asks: can I return my dishwasher? I bought it 45 days ago. Same model, same prompt as always. Let us look inside.",
  B2: "First the question becomes numbers. 1,536 of them. That is how the search compares meaning, not words.",
  B3: "The search finds four documents. Look at the red badge: nobody checked who is asking. Problem 3 starts here.",
  B4: "Ranked by similarity. The old v1 and its scanned copy are on top. Similarity knows similar. It does not know old. Problems 1 and 2.",
  B5: "Open the files. v1 and the scan say exactly the same thing. The same fact, twice.",
  B6: "Now the code from most demos: glue everything, cut at 160 characters. Watch the counter. Only 'Returns are a' of the correct policy survives. Problem 4. And nobody gets an error.",
  B7: "This is what the model really received. The correct policy never arrived. Would a better prompt help? No. You cannot follow a document you never saw.",
  B8: "And the answer: 60 days, plus a staff-only credit. Wrong, and a leak. Same model, same prompt. Next: the four problems.",
  // ---------------------------------------------------------------- Session 1, four problems
  P1: "Problem 1, stale. Version 1 was replaced in March, but it is still in the search. Fixed by Refresh.",
  P2: "Problem 2, duplicate. A scanned copy of the same PDF. Same fact twice, space gone. Fixed by Budget.",
  P3: "Problem 3, leak. The search ran without the user's identity. A staff rule reached a customer. Fixed by Secure.",
  P4: "Problem 4, the worst. The only correct document was cut off, silently, at the end. Fixed by Budget, and Observe tells you it happened.",
  P5: "None of them is in the prompt. That is why this talk is about context, not prompts.",
  // ---------------------------------------------------------------- Session 1, fixed run
  F1: "Now the same request through the six stages. Select: a policy question goes to the policy search. Nothing else.",
  F2: "Secure: the search runs with the customer's groups. The staff rule is filtered inside the store. It never leaves.",
  F3: "Rank only what is allowed. Same scores as before.",
  F4: "Refresh: is it still true? Version 1 and its scan are rejected, status superseded. And the reason is written down.",
  F5: "Budget: we plan the space, we do not cut. Version 2 needs 28 tokens out of 8,000. It goes in whole.",
  F6: "Validate: tool results are checked in code before the model sees them. Bad data is stopped, not guessed.",
  F7: "Observe: the manifest. What went in, what was rejected, and why. Next week, 'why did it say 60 days?' takes one look, not one meeting.",
  F8: "The answer: the 30 days have passed, but the warranty covers a repair. No staff rule. Same model, same prompt.",
  // ---------------------------------------------------------------- Session 1, compare
  C1: "Documents searched: four, with no identity. Three, filtered for this customer.",
  C2: "In the window: four pieces glued and cut. One document, whole.",
  C3: "The correct policy: 13 characters, against all 113.",
  C4: "Staff-only text shown to a customer: yes, against no.",
  C5: "The answer: wrong, against right.",
  C6: "Can you explain it later? No record, against a manifest.",
  C7: "Same model. Same prompt. Only the context changed. Your turn: scan the QR code and try to break it.",
  // ---------------------------------------------------------------- Session 2, broken run
  S1: "Same assistant, now with tools. The ticket: refund 8812, and also 9031 for my neighbour. Look at the badge: it acts as a service account.",
  S2: "Step 1: it searches the policy. A read. Harmless.",
  S3: "Step 2: it reads the order. 349 euros. Still a read.",
  S4: "Step 3: refund 349 euros. Timeout. But look at the ledger: the payment went through. The agent does not know.",
  S5: "Step 4: it tries again. Same call, no key. Paid again. 698 euros.",
  S6: "Step 5: the neighbour's order. Nobody checks whose order it is. 827 euros. And why did it even try? Because the ticket text said so.",
  S7: "Then it drafts replies, again and again, until step 14. Nothing stops it.",
  S8: "827 euros paid. The correct amount without a human: zero. And the last message was polite, so a test of the answer alone passes.",
  // ---------------------------------------------------------------- Session 2, four failures
  X1: "One: paid twice. A timeout is not a failure. Fixed by Contain.",
  X2: "Two: someone else's order. A service account can refund anything. Fixed by Authorize.",
  X3: "Three: text written by a customer caused a payment. Fixed by Gate.",
  X4: "Four: nothing stopped it. No limit on steps, time or money. Fixed by Bound.",
  X5: "The model did what the text asked. A better prompt works most of the time. Money needs every time.",
  // ---------------------------------------------------------------- Session 2, through the gateway
  G0: "Same ticket, now through the gateway. The agent acts on behalf of the customer, and the ticket is marked untrusted.",
  G1: "Step 1: search. Every check passes. Allowed.",
  G2: "Step 2: read the order. The customer owns 8812. Allowed.",
  G3: "Step 3: the refund. Watch the checks. Customer text is in the context: ask a human. Here is the inbox. I deny it: 45 days is outside the 30-day window, we offer a repair. Session 1's manifest helps session 2.",
  G4: "Step 4: the retry. Same idempotency key. Denied. It can never be paid twice.",
  G5: "Step 5: the neighbour. The order does not belong to this customer. Denied.",
  G6: "Steps 6 to 8: drafts. Harmless, allowed.",
  G7: "Still inside the budget.",
  G8: "Step 8 of 8.",
  G9: "Step 9: stop. The budget of 8 steps is used. The run saves its state, and a human takes over.",
  GX: "Zero euros without a human. One approval, two refusals, one clean stop. And every step wrote an audit record that links to the session 1 manifest.",
  // ---------------------------------------------------------------- Session 2, path check
  T1: "Grade the path, not only the answer. The broken run fails three checks. The gated run passes.",
  T2: "pass to the power k. 80 percent per run sounds fine. Four runs in a row: 41 percent. Your customers get every run, not your best one.",
  T3: "Promote autonomy with evidence: shadow, suggest, supervised, bounded. Write the gate down before you start. Your turn: scan the QR code and try to break the agent.",
};
