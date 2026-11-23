# System dark mode

- Date: 2026-11-23
- Changes: "Dark mode: not done yet" in [the shadcn/ui setup](2026-11-23-shadcn-ui.md)
- AI usage: Claude Code proposed and wrote the change after the author said to continue.

## Decision

`client/src/theme.ts` toggles the `.dark` class on `<html>` from `prefers-color-scheme`, and listens for OS changes. Called in `main.tsx` before the first render.

`.dark` also sets `color-scheme: dark`, so native parts (scrollbars, file picker button) follow.

## Why a class and not the media query in CSS

The shadcn theme and every `dark:` variant key on `.dark`. Keeping the class lets the frame page force dark on itself while the upload page follows the OS. Rewriting the theme around the media query would diverge from what `shadcn add` generates.

## Not done

No manual light/dark switch: no need in the brief.
