# AGENTS.md

Human docs (French), read them when the task needs them: [README.md](README.md) (setup, scripts), [ARCHITECTURE.md](ARCHITECTURE.md) (photo flow, dev networking, config, data), [CONTRIBUTING.md](CONTRIBUTING.md) (git flow, commits, PRs, language rule).

## Project

Simplon school brief: a connected photo frame. **The learning goal is containerization (Docker, Compose)**, not app complexity. The author must be able to explain every line: prefer simple, readable code over clever code.

- `client/`: React + Vite (TS). Dev server on **5180** (`strictPort`), proxies `/api` and `/socket.io` to the API.
- `server/`: Express 5 + Socket.IO + Prisma (TS). API on **3000**. Env loaded by Node `--env-file`, validated in `server/src/config.ts`.

## Commands

- `pnpm dev`: client + server in watch mode
- `pnpm check:fix`: Biome lint/format/imports (CI-equivalent check: `pnpm check`)
- `pnpm typecheck` / `pnpm build`
- `pnpm test:hooks`: tests for `.claude/hooks/`
- `pnpm --filter server db:push`: sync the Prisma schema to MongoDB

## Pitfalls

- **Prisma stays on v6**: v7+ does not support MongoDB. Do not suggest upgrading.
- The `.env` read guard matches on command text: a command containing both a reader word (`grep`, `cat`…) and `.env`, such as an inline commit message, is blocked. Pass long text through a file (`git commit -F`).
- `git commit` runs Biome (pre-commit) and commitlint (commit-msg). A failing hook means the commit did not happen.

## Working rules

- **Atomic commits**, made as you go: one concern each, each passing `pnpm check` and `pnpm typecheck`.
- **No "done" without proof**: run the relevant check and quote its output.
- **No new dependency without approval**: check what is installed first.
- Specs and plans go in `docs/superpowers/{specs,plans}/YYYY-MM-DD-<topic>.md` (English). They record decisions and AI usage for the reflective analysis: never rewrite one, add a new doc when a decision changes.

## TypeScript

- No `as` casts to silence the compiler: type properly or validate at runtime.
- Explicit return types on exported functions.
- Literal unions rather than `enum`.
