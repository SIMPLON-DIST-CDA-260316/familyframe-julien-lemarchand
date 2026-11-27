# Page width: one shell for every page

Date: 2026-11-26. Asked by Julien after a desktop pass in Chrome: "regarde les différentes vues, hors frame, et vois les inconsistances de largeur de page".

## Problem

Measured in Chrome at 1440 px, under the same 1024 px account bar (`max-w-5xl`):

| Page                    | `main` width                           | title left edge          |
| ----------------------- | -------------------------------------- | ------------------------ |
| Library                 | 1024 px (`max-w-5xl`)                  | aligned with the logo    |
| Send, Friends, Settings | 672 px (`max-w-2xl`), centred          | 176 px right of the logo |
| Admin invitations       | 448 px (`max-w-md`), centred, no title | 288 px right of the logo |

Going from one tab to the next, the title jumps sideways and the main button moves: Library's « Ajouter » sits under the avatar, Friends' at the right of a narrower column, and Send's under its title.

## Decisions

| Topic                 | Decision                                                                                                                   | Why                                                                                      |
| --------------------- | -------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| Width tokens          | `--container-page: 64rem` and `--container-reading: 42rem` in `@theme`, so Tailwind gives `max-w-page` and `max-w-reading` | names say the role, not a size; one place to change                                      |
| Shell                 | every page under the account bar uses `PageMain`: `max-w-page`, the bar's 1rem gutter, the same top spacing                | the title starts under the logo on every page                                            |
| Page header           | spans the page: title on the left, the main button on the right, under the avatar                                          | the main action has one place on a computer, as in the library                           |
| Body                  | forms and lists sit in `ReadingColumn` (`max-w-reading`), left-aligned under the title                                     | 42rem keeps rows and fields easy to scan; a full-width row of « Retirer » buttons is not |
| Library               | the photo grid keeps the full page width                                                                                   | photos are what one came for                                                             |
| Admin invitations     | gets an « Invitations » title like the other pages                                                                         | without it the page had no anchor on the left                                            |
| Centred message pages | 404, the admin-only card, login and invite stay narrow and centred                                                         | a lone message or a form with no account bar has no edge to align to                     |
| Phone                 | unchanged: under `md` the page is already one column with a 1rem gutter                                                    | the fix is for computers                                                                 |

## Row action buttons

Asked by Julien during the same pass: the « … » of the list view and of the thumbnails did not look alike.

| Where                                                  | Button                                                                                   | Why                                                                                                  |
| ------------------------------------------------------ | ---------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| On the page (list row, collection title, Send's trash) | ghost `size="icon"`: 32 px (44 px under a finger), `rounded-lg`, `text-muted-foreground` | the list row's « … » was a 28 px circle, the collection's a dark 32 px square: one look for one role |
| On a photo (thumbnail, viewer, frame)                  | the dark round pill, unchanged                                                           | over any image only a dark pill stays legible                                                        |

The list view keeps the page's full width, as decided when the library's edges were aligned with the header.

## Out of scope

The frame (full screen), the viewer and the dialogs.

## AI usage

Claude measured the pages in Chrome, chose the two widths and wrote the change. Julien reviews the result.
