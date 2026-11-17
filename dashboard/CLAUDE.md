# Rules for any Claude session working on the dashboard

1. Read `PLAN.md` in this folder before doing anything. It is the single source of truth.
2. Continue from the first unchecked box in section 14 (Progress) of `PLAN.md`. Do one task at a time.
3. After each task: tick its box in section 14 and add one line to section 15 (Build log) with the date and what changed.
4. The Python files in `../companion-code/` are the source of truth for demo data and logic. Change Python first, regenerate the golden JSON, then the TypeScript. `npm test` must pass before a task is done.
5. UI text: simple English, short sentences, no em dashes. Acme Home is fictional; no real company names in the app.
6. Secrets only in environment variables (`.env.local` locally, Vercel settings online). Never commit them. The Anthropic key is used only in server code.
7. Before writing any Claude API code (phase 8), load the `claude-api` skill.
8. Stage mode must work with no network after the page has loaded. Do not add network calls to the story screens.
9. The owner (Sinda) is not a front-end developer. Explain decisions in plain words and say what is not done or not tested.
10. This is Next.js 16 (see `AGENTS.md`): APIs may differ from what you remember. Check `node_modules/next/dist/docs/` before using a Next.js API you are not sure about.
