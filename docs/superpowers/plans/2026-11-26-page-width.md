# Page width plan

Spec: `docs/superpowers/specs/2026-11-26-page-width-design.md`. Branch `feat/page-width`, on top of `feat/design-tokens`.

1. Tokens and shell: add `--container-page` and `--container-reading` to `@theme`; add `components/layout/PageMain.tsx` (`PageMain`, `ReadingColumn`); the account bar uses `max-w-page`.
2. Pages: Library, Send, Friends, Settings and Admin invitations use `PageMain`. Send's header puts its button on the right like Friends. Send, Friends, Settings and Admin wrap their body in `ReadingColumn`. Admin gets its « Invitations » title.
3. Checks: `pnpm check` (scoped), `pnpm typecheck`, `pnpm build`, `pnpm test`, `pnpm test:bruno`; Chrome at 1440 px (same left edge for every title, main button under the avatar) and at 360 px (unchanged).
