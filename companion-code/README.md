# Companion code: MLCon Berlin 2026

Two small files, standard-library Python only (3.10+). No API key, no vector DB.
The model is replaced by recorded proposals so every control is visible and repeatable.

| File | Session | What it shows |
|---|---|---|
| `context_layer.py` | 1. Context Engineering | typed context elements, ACL before ranking, freshness rules, token budget with logged eviction, tool-result validation, context manifest |
| `action_layer.py` | 2. From Answering to Acting | run budgets, tool contracts, call-time authorization on behalf of the user, idempotency keys, taint-aware approval, audit record, trajectory checks, pass^k |

```bash
python3 demo_session1.py
python3 demo_session2.py
```

Running example for both talks: the Acme Home support agent.
Session 1: "Can I return my dishwasher? I bought it 45 days ago."
Session 2: the same agent can now issue refunds.

This is teaching code. In production these checks live in your retrieval
service (Session 1) and in a tool gateway in front of every API (Session 2).
