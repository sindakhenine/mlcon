# From Context to Action

Companion code and live demo for two talks at **MLCon Berlin 2026** by Sinda Khenine:

1. **Context Engineering Is the New Prompt Engineering: Practical Patterns for Reliable Enterprise AI Agents**
2. **From Answering to Acting: Engineering Reliable Autonomous Enterprise Agents**

The running example is a support agent for **Acme Home**, a fictional company. In Session 1 it gives a wrong answer because of what entered its context window. In Session 2 it can issue refunds, and pays 827 EUR it should not have, until a gateway decides every action.

## What is in this repo

| Folder | What it is |
|---|---|
| [`companion-code/`](companion-code/) | Plain Python, no LLM and no vector database, so every step is visible. `python3 demo_session1.py` and `python3 demo_session2.py` show the broken pipeline and the fixed one side by side. |
| [`dashboard/`](dashboard/) | The live demo website (Next.js). An X-ray of the agent: watch it fail step by step, see the four problems, then the fixed pipeline. Work in progress. |

## Run it

```bash
cd companion-code
python3 demo_session1.py
python3 demo_session2.py
```

```bash
cd dashboard
npm install
npm test        # the TypeScript engines must match the Python demos
npm run dev
```

The Python code is the source of truth. `python3 companion-code/export_traces.py` writes its results to `dashboard/fixtures/golden/`, and the dashboard tests compare against them.

All systems in the demos are simulated. No real money, no real customers.
