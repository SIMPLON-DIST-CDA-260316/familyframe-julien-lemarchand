# Photo info panel: brief

Addendum to [2026-11-25-steps-13-16-brief.md](2026-11-25-steps-13-16-brief.md), asked by Julien on 2026-11-25 with Google Photos screenshots (« Infos » button in the viewer: side panel on desktop, full screen on phones). It joins step 15 (finishes); it does not rewrite the brief.

## Why

Today the viewer shows a photo and its actions, but not what we know about it: when it arrived, who sent it, with which message, in which collections. Julien: « on devrait pouvoir consulter les informations d'une photo ».

## Decisions

- **Entry:** an « Infos » button (ⓘ) in the viewer's top bar, next to the ⋯. Keyboard reachable, `aria-expanded`. The `i` key may toggle it if free.
- **Desktop:** a panel on the right side of the viewer; the photo shrinks to make room (it is not covered). The choice is remembered for the session while browsing photos (next/previous keeps it open), as Google does.
- **Phones:** a bottom drawer (Julien: « un drawer serait probablement plus élégant »), hand-made on the existing sheet component: no `vaul`, no new dependency. It covers about half the screen, the photo stays visible above; swipe down or ✕ closes it.
- **Content, only what we already know or can store at upload without a new dependency:**
  - Ajoutée le (date and time, with « Aujourd'hui », « Hier » as in the library).
  - Envoyée par (friend's name) and their message, when the photo came from a friend.
  - Collections the photo belongs to (links that open the library filtered on that collection).
  - Dimensions and weight of the kept image (stored at upload from what the server already measures; older photos show nothing for it).
- **Privacy:** no location, ever (no GPS read or shown). Nothing about the recipients' side.
- **Not now (open questions in the spec):**
  - Date taken and camera (EXIF): needs an EXIF parser dependency, and the client downscale (step 14) drops EXIF. Ask Julien before adding a dependency.
  - An editable description of my own photos (Google's « Ajouter une description »): a new feature, to discuss.
