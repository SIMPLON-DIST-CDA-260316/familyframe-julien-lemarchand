---
plan: design-tokens
status: done
spec: docs/superpowers/specs/2026-11-25-design-tokens-design.md
branch: feat/design-tokens
worktree: false
tasks_total: 9
tasks_done: 9
current_task: null
last_commit: null
last_updated: 2026-11-26
---

# Design tokens and the « Encre » palette Implementation Plan

> **For agentic workers:** built in a throwaway clone, one commit per task. Each task lists its files and its gates.

**Working agreement (mandatory):** keep this plan in sync with reality. Append every divergence to the Drift Log. When a drift changes a decision of the spec, add a new spec doc rather than rewriting this one.

**Goal:** every colour in the client comes from a semantic token; « Encre » is the default palette, « Actuelle » (today's shadcn neutral) stays one attribute away, in light and dark; the person picks one in the account menu.

**Architecture:** `client/src/index.css` holds constant tokens once in `:root` and one block of semantic values per palette and mode (spec D1–D4). `palette.ts` sets `data-palette` on `<html>` like `theme.ts` sets `.dark`; `themeColor.ts` copies the computed `--background` into the `theme-color` metas.

**Tech Stack:** React 19, Tailwind 4 (`@theme inline`), shadcn (Radix), Biome 2. Server untouched.

## Global Constraints

- **No new dependency.** **Server untouched:** no Bruno, no unit test change.
- **No client test runner:** gates are `pnpm check`, `pnpm typecheck`, `pnpm build` (and `pnpm test` once, to show the server is untouched). The visual pass in Chrome is done by the controller.
- No `as` casts, explicit return types on exported functions, literal unions.

## Tasks

1. **docs: spec and plan.** This file and the spec.
2. **refactor(client): drop the unused sidebar and chart tokens** (spec D14). `index.css`.
3. **refactor(client): name the photo chrome colours as tokens** (D4, D5). `index.css`, `frame/controlClasses.ts`, `frame/PhotoGridTile.tsx`, `frame/PhotoView.tsx`, `frame/PhotoCaption.tsx`, `library/PendingUploads.tsx`, `viewer/ViewerTopBar.tsx`, `viewer/ViewerCaption.tsx`.
4. **refactor(client): name the frame's wall, print and accent text colours as tokens** (D4, D5, D7 with today's values). `index.css`, `frame/templateClasses.ts`, `frame/PolaroidPrint.tsx`, `frame/NewPhotosBadge.tsx`, `frame/WaitingPhotosBadge.tsx`, `library/LibraryHeader.tsx`, `mail/MailRevealDialog.tsx`.
5. **feat(client): one modal backdrop and a destructive foreground token** (D6, D9 with today's values). `index.css`, `ui/dialog.tsx`, `ui/alert-dialog.tsx`, `ui/sheet.tsx`, `friends/FriendsViewToggle.tsx`.
6. **feat(client): the « Encre » palette by default, « Actuelle » kept** (D1–D3, D7, D8, D9, D11, D12). `index.css`, `index.html`, `palette.ts`, `themeColor.ts`, `theme.ts`, `main.tsx`, `mail/MailAnnouncementCard.tsx`, `docs/produit/apparence-et-navigation.md`, `ARCHITECTURE.md`.
7. **feat(client): choose the palette in the account menu** (D13). `theme/PaletteToggle.tsx`, `auth/UserMenu.tsx`, `docs/produit/apparence-et-navigation.md`.
8. **fix(client): give the theme-color metas an RGB colour** (drift 1). `themeColor.ts`.

Each task: `pnpm check`, `pnpm typecheck`; tasks 6 and 7 also `pnpm build`. Then a re-grep for `black|white|#hex|rgb(` in `client/src`.

## Drift Log

1. **D11, how the colour reaches the meta.** A fresh-context review flagged that `syncThemeColor` wrote the computed `--background` as is, an `oklch()` string, and a browser may not accept it in a `theme-color` meta. `themeColor.ts` now paints the colour on a one-pixel canvas and writes the `rgb(…)` it reads back (task 8). The decision (the meta follows the token) is unchanged.
2. **Product rules.** R-APP-78 (Encre by default, Actuelle kept, accent follows the palette), R-APP-79 (browser bar follows the chosen theme and palette, replaces R-APP-57 for the bar), R-APP-80 (palette independent of the theme, applied at once), R-APP-81 (remembered per device and browser). Other branches may claim numbers in the same range: renumber on merge if they collide.
3. **The frame gradient's `via` stop** was kept dropped after review: recorded in spec D5.
4. **Selected item in the account menu toggles.** The controller's Chrome pass found the chosen « Thème » and « Palette » item barely visible in dark (Encre `muted` 0.27 on `popover` 0.23; already true of `ThemeToggle` before). Both toggles now invert the chosen item (`bg-foreground` / `text-background`), as `SettingToggleGroup` does: about 14:1 against the menu in every palette and mode.
