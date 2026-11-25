# Floating page button Design

Status: decided and built by an agent from the controller's brief; the author reviews afterwards. Plan: [2026-11-26-page-fab.md](../plans/2026-11-26-page-fab.md). Base: `feat/send-flow` (175543a).

## Request

The author, testing on a phone: « Dans un souci de cohérence, ne faudrait-il pas que pour chaque vue (quand pertinent) le CTA soit flottant comme sur la vue de bibliothèque ? » On `/send` the « Envoyer une photo » button sits inline under the title, while the library has a floating « + » bottom right.

## Decisions

- **D1 · Phones only.** Below `md` a page's main action is a floating round button; the header button is hidden there (`hidden md:inline-flex`). A computer keeps its header button and gets no floating one.
- **D2 · One shared component, `components/nav/PageFab.tsx`.** Generalised from `AddPhotoFab`: same position (bottom right, above the tab bar and the safe areas), size, shadow, page-colour ring, hide on scroll down (`useHideOnScrollDown`) and `data-fab-shown` on `<html>` so toasts move above it (R-APP-66). Props: `icon` (a `LucideIcon`), `label` (both `aria-label` and `title`, as before), `onClick`, `buttonRef`. `AddPhotoFab` is deleted: the library renders `PageFab` with `PlusIcon` and « Ajouter une photo », no visible change. Rejected: keeping `AddPhotoFab` as a one-line wrapper (an indirection that says nothing).
- **D3 · One floating button per page, at most.** The page owns it; nothing global.
- **D4 · `/send`.** `PageFab` with `SendIcon` (the paper plane of the tab) and « Envoyer une photo » opens the same source panel. `useSendFlow` now takes the list of triggers and gives focus back to the shown one, as the library's add panel does; `shownButton` moves from `AddPhotoPanel.tsx` to `lib/shownButton.ts` so both share it. The page gets `pb-24 md:pb-10` like the library, so the button never covers the last history row.
- **D5 · Friends page.** It has one primary action, « Ajouter un ami », in its header: same treatment, `UserPlusIcon`. The empty state's « Ajouter un ami » stays (it explains the empty list). Focus after the dialog closes is left to Radix, which returns it to the element that opened it (the floating button on a phone, the header button on a computer); `pb-24 md:pb-10` as well.
- **D6 · No floating button on:**
  - the frame: « Cadre » opens a full-screen frame, there is no page under a button;
  - preferences: five independent cards, each with its own save; no single main action;
  - admin invitations: the creation form is inline in the first card (e-mail field + « Créer l'invitation »), there is no trigger button to lift; a floating button would only scroll to a form already on screen.
- **D7 · Toasts.** The existing `data-fab-shown` rule in `index.css` already applies to any page that shows the button; only its comment changes.

## Product docs

- `apparence-et-navigation.md`: new R-APP-76 (the floating main action, per page) and R-APP-77 (toasts above it on every page that has one, extends R-APP-66).
- `bibliotheque.md`: new R-BIB-74 (the « + » is no longer the only one, R-BIB-48 said « only on the library »).
- `partage.md`: R-PAR-67 (new in this stack) edited in place.
- `amis.md`: new R-AMI-46.
