/** Live votes for the exercises (PLAN.md 7). Shared by the phones, the admin page and the stage page. */
export interface Poll {
  id: string;
  session: "s1" | "s2";
  question: string;
  options: { id: string; label: string }[];
  answer: string;
}

export const POLLS: Poll[] = [
  {
    id: "s1-stage",
    session: "s1",
    question: "The drain pump costs 45 EUR since yesterday. The assistant said 39 EUR from a cache. Which stage failed?",
    options: [
      { id: "A", label: "A. Select" },
      { id: "B", label: "B. Secure" },
      { id: "C", label: "C. Refresh" },
      { id: "D", label: "D. Validate" },
    ],
    answer: "C",
  },
  ...(
    [
      ["a", "A. Step 3: refund 349 EUR for order 8812", "approve"],
      ["b", "B. Step 4: the same refund again after a timeout", "deny"],
      ["c", "C. Step 5: refund 129 EUR for order 9031 (the neighbour)", "deny"],
      ["d", "D. Step 9: one more draft reply", "deny"],
    ] as const
  ).map(
    ([k, q, answer]): Poll => ({
      id: `s2-${k}`,
      session: "s2",
      question: `${q}. What does the gateway do?`,
      options: [
        { id: "allow", label: "Allow" },
        { id: "approve", label: "Ask a human" },
        { id: "deny", label: "Deny or stop" },
      ],
      answer,
    }),
  ),
];

export const pollById = (id: string) => POLLS.find((p) => p.id === id);
