# AGENTS.md

- @README.md
- @ARCHITECTURE.md
- @CONTRIBUTING.md

## Key points

- **Learning goal**: containerization (Docker, Compose), not application complexity. The author must be able to understand and explain the code: prefer the simple, readable solution over the clever one.
- **Prisma stays on v6**: do not suggest upgrading (MongoDB is not supported in 7+).
- **Atomic commits**, made as you go, each one passing `pnpm check` and `pnpm typecheck`.

## Working docs

Specs, plans and notes produced with AI are versioned and named `YYYY-MM-DD-<topic>.md`:

- `docs/superpowers/specs/`: design validated before implementing;
- `docs/superpowers/plans/`: implementation plan broken into steps.

They record decisions and AI usage for the brief's reflective analysis. A doc is dated the day it is created and not rewritten afterwards: a changed decision gets a new doc.

## Behaviour rules

1. **Ambiguous → ask.** Do not guess intent; ask before writing code.
2. **Plan before any multi-step task**, and present the plan.
3. **Surgical diffs**: touch only what the task requires, no opportunistic refactors or speculative code.
4. **No "done" without proof**: run the check (check, typecheck, build, test, HTTP request…) and quote its output.
5. **No new dependency without approval**: check what is already installed first, then ask.
6. **Secrets**: never read, print or log the contents of a `.env` file (a hook blocks reads). Point to `server/.env.example` instead.
7. **Debugging**: restate the symptom, list likely causes with a confidence level, verify before fixing.

## TypeScript

- No `any` and no `as` casts to silence the compiler: type it properly or validate at runtime.
- Explicit return types on exported functions.
- Literal unions rather than `enum`.
