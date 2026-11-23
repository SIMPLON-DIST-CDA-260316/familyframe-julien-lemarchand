# Frame UI polish

- Date: 2026-11-23
- Changes: the look of the `/frame` page built by [the frame views spec](2026-11-23-frame-views-design.md) and [the frame slideshow spec](2026-11-23-frame-slideshow-design.md). No behaviour of the slideshow, the selection or the controls changes.
- AI usage: the author found the frame "triste et pauvre" ("sad and poor") and asked Claude Code for a UI review with the ui-ux-pro-max skill. The review proposed eight improvements, ranked by impact, and three PRs. The author approved all three PRs and made the choices below. Claude Code then wrote this spec and its plan, adjusting the review to the code rules (props, function length) and correcting one wrong assumption about `.dark`.

## Context

On a wall, the frame reads as "a monitor showing a JPEG":

1. Flat black bars take about 30 % of the screen around landscape and portrait photos.
2. The caption is a 14 px label with a timestamp to the second, unreadable from 2–3 m away.
3. The controls are seven outlined boxes, with no grouping and a selected state that is hard to see.
4. The thumbnail strip shows a native scrollbar, shrinks the photo, and dims every thumbnail to a muddy 60 %.
5. The contact sheet touches the screen edges, its names are tiny, and nothing marks the current photo.
6. Nothing moves between two slides: the photo is frozen for 10 s.
7. The palette is pure grey (`oklch(0.145 0 0)`), with no accent for "current" or "new".
8. The empty state is one grey line that does not say how to add a photo.

Direction: "a warm living-room frame at dusk". The photo is the only bright thing on screen; everything else is soft, translucent and recedes.

## Decisions

| Question               | Choice                                                                                                                                                                                 |
| ---------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Black bars             | One blurred, dimmed copy of the current photo fills the screen behind the carousel (`PhotoBackdrop`). Only one, never one per slide.                                                   |
| Backdrop source        | `photo.thumbnailUrl` (640×640, about 19 KB) rather than `photo.url` (about 470 KB): it is blurred anyway.                                                                              |
| Caption                | Large type (`text-3xl` name, `text-base` date) on a bottom gradient scrim, date as "23 novembre 2026" with no time. New `PhotoCaption.tsx`.                                            |
| Motion between photos  | Keep Embla's slide, slowed with `opts={{ duration: 45 }}` (default 25). Ken Burns zoom (scale 1 → 1.06 over 20 s) on the current slide only. No fade plugin.                           |
| Palette                | New frame-only tokens `--frame-background` (warm near-black `oklch(0.14 0.008 60)`) and `--frame-accent` (amber `oklch(0.82 0.12 75)`). The `.dark` tokens stay as they are.           |
| Accent use             | Only for "current" and "new": current thumbnail, current contact-sheet tile, new-photos badge, empty-state icon.                                                                       |
| Controls               | One glass pill (`bg-black/45 backdrop-blur-xl ring-1 ring-white/10`), dividers between groups (view, strip, play, pace), ghost toggles with a filled chip as the selected state.       |
| Strip                  | Floats over the photo at the bottom, no scrollbar, accent ring and `scale-110` on the current thumbnail, the current thumbnail scrolled into view.                                     |
| Contact sheet          | Margins (`p-8 pt-24`, clear of the pill), larger tiles, the name over the photo on a scrim, hover zoom, accent ring on the current photo.                                              |
| New-photos badge       | Accent pill in `text-base` with a pulsing dot, announced through `aria-live="polite"`.                                                                                                 |
| Empty state            | Icon, a large "En attente de la première photo…", and "Envoyez-en une depuis votre téléphone : <host>". No QR code.                                                                    |
| Reduced motion         | Every new animation is `motion-safe:` (or `motion-reduce:` to switch a transition off). The strip's `scrollIntoView` is instant under reduced motion.                                  |
| Thumbnails and loading | Strip and contact sheet use `photo.thumbnailUrl` with `loading="lazy"` and `decoding="async"`. Slides keep `photo.url`; the current one gets `fetchPriority="high"` and is never lazy. |
| shadcn components      | `components/ui/*` stay as generated: styling goes through `className` and `opts` only.                                                                                                 |
| Dependencies           | None added.                                                                                                                                                                            |

### Rejected

- **`embla-carousel-fade`** (a real crossfade between photos): a new dependency, and it also turns manual swipes into fades, which loses the "the photo follows my finger" feedback. The blurred backdrop already fades in on each change, so the change feels soft without it.
- **Fraunces font** (`@fontsource-variable/fraunces`, a soft serif for names): a new dependency for a small gain; Geist at `font-medium` and `text-3xl` is warm enough.
- **QR code to the upload page** (`qrcode.react`): a new dependency only worth it for demos in front of people. The empty state prints the host instead.
- **Warming the `.dark` tokens** (the review's palette proposal): the review assumed only the frame used `.dark`. It does not: `client/src/theme.ts` toggles `.dark` on `<html>` from `prefers-color-scheme`, so the upload page would turn warm too. Frame-only tokens leave the rest of the app untouched.
- **One blurred backdrop per slide**: N full-screen blurs is the expensive version on a Raspberry Pi class screen.
- **`duration: 0` for Embla under reduced motion**: the slide predates this work and is a short movement. Only new animations get the `motion-safe:` treatment.
- **Optional extras from the review**: staggered fade-in of the contact sheet, relative dates ("il y a 2 jours"), scroll snapping in the strip. Not needed for the "warm frame" goal; each adds code to explain.

## Components

All paths under `client/src/`.

| File                                     | PR  | Change                                                                                                                                                      |
| ---------------------------------------- | --- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `index.css`                              | A   | `--frame-background` and `--frame-accent` in `:root`, mapped in `@theme inline`; a `ken-burns` keyframe and `--animate-ken-burns` in a new `@theme` block.  |
| `components/frame/PhotoBackdrop.tsx`     | A   | New. One `<img>` of the current photo's thumbnail, blurred, dimmed and scaled, behind everything. Remounted per photo (`key`) so it fades in.               |
| `components/frame/PhotoCaption.tsx`      | A   | New. Name and human date of the current photo. Remounted per photo (`key`) so it rises in.                                                                  |
| `components/frame/PhotoSlide.tsx`        | A   | New. One carousel slide: the full photo, Ken Burns and loading priority when it is the current one.                                                         |
| `components/frame/PhotoView.tsx`         | A   | Layers: backdrop, carousel (`duration: 45`), bottom overlay with caption and strip. Derives the current photo from `photos` + `currentId`. Same five props. |
| `components/frame/PhotoStrip.tsx`        | A-B | A: lets clicks through the overlay. B: thumbnails, no scrollbar, accent current, current scrolled into view.                                                |
| `pages/FramePage.tsx`                    | A-C | A: `bg-frame-background`. B: dividers and `StripToggle` in the pill. C: empty state, `currentId` to the contact sheet, badge always mounted.                |
| `components/frame/FrameControls.tsx`     | B   | The glass pill; hides faster (200 ms) than it shows (300 ms).                                                                                               |
| `components/frame/ControlsDivider.tsx`   | B   | New. A thin vertical rule between groups of the pill.                                                                                                       |
| `components/frame/pillToggleClasses.ts`  | B   | New. The class string shared by every toggle of the pill (ghost, rounded, filled chip when on).                                                             |
| `components/frame/ViewToggles.tsx`       | B   | Photo/Pellicule only, ghost style. The strip toggle moves out.                                                                                              |
| `components/frame/StripToggle.tsx`       | B   | New. The strip toggle, with a `title` tooltip.                                                                                                              |
| `components/frame/SlideshowControls.tsx` | B   | Ghost style, a divider between play/pause and the pace.                                                                                                     |
| `components/frame/ContactSheet.tsx`      | C   | Takes `currentId`. Gallery layout, overlay names, hover zoom, accent ring on the current photo, thumbnails.                                                 |
| `components/frame/NewPhotosBadge.tsx`    | C   | Always mounted live region; the accent pill shows when `count > 0`.                                                                                         |

## Behaviour

- **Layers of the photo view**: the backdrop sits at `-z-10` inside an `isolate` wrapper, so it is behind the carousel and the overlay but above the page background. The wrapper uses `overflow-clip`, not `overflow-hidden`: the backdrop is scaled to 125 % and overflows, and a `hidden` box can still be scrolled by `scrollIntoView`, which would shift the whole frame.
- **Backdrop change**: `key={currentPhoto.id}` remounts the `<img>`, and its `fade-in` runs again (1 s). The old backdrop disappears at once and the new one fades in from the dark background. This is a fade-in, not a true crossfade, which would need two images.
- **Caption**: one caption for the current photo, outside the slides, remounted per photo, so it rises in after each change. During a swipe it keeps the old name until Embla selects the new slide.
- **Ken Burns**: only the current slide has `animate-ken-burns`. When a slide becomes current, the class is added and the animation starts from scale 1. The slide that leaves loses the class and goes back to scale 1 at once while it slides out; at 6 % on a moving image this is accepted. The animation lasts 20 s (the longest interval) and holds its end (`forwards`), so a paused photo stays still once zoomed. `CarouselItem` clips with `overflow-hidden` so the zoom never covers the next slide.
- **Loading**: the current slide is `loading="eager"` and `fetchPriority="high"`; the others are `loading="lazy"`. The neighbouring slides are next to the viewport, so the browser fetches them before they slide in.
- **Bottom overlay**: one `absolute bottom-0` column with the gradient scrim, the caption, then the strip when it is visible. The caption sits above the strip, and the photo keeps the full screen height. The overlay ignores pointer events (swipes reach the carousel); the strip turns them back on.
- **Strip current thumbnail**: the `<li>` of the current photo carries a callback ref. React calls it when it lands on a new element, that is when the current photo changes or when the strip opens, and it centres that thumbnail with `scrollIntoView({ inline: 'center', block: 'nearest' })`, smooth or instant depending on `prefers-reduced-motion`.
- **Pill**: groups are separated by `ControlsDivider`: view | strip | play | pace. In the contact sheet only the view group shows, without dividers. Toggles keep their `aria-label`s; the strip toggle gains `title="Vignettes"`.
- **Badge**: the `aria-live` wrapper is always mounted, empty at zero, so screen readers announce the badge when it appears and when its count grows.
- **Unchanged**: `useCarouselPhoto` (keeps `useEffect`), `useSlideshow`, `useFrameSelection`, `useIdleControls`, the always-mounted `FrameControls` with `inert`, the `PhotoView` props (`photos`, `currentId`, `isStripVisible`, `autoAdvanceMs`, `onCurrentChange`), the upload page.

## Verification

The client has no test framework. Each PR runs `pnpm check`, `pnpm typecheck`, `pnpm build`, then a manual check in Chrome on the frame (port 5181), with DevTools "Emulate CSS prefers-reduced-motion" for the reduced-motion lines:

- **PR A**
  - a portrait photo: the side bars show the photo's own colours, blurred and dark, never flat black;
  - a slide change: the backdrop fades in, the caption rises in, the slide glides more slowly than before;
  - the name reads from across the room; the date reads "23 novembre 2026", with no time;
  - over 10 s the photo zooms in slowly, without covering the next slide;
  - DevTools Network: the backdrop requests the thumbnail URL, the current slide is fetched with high priority;
  - with the strip on, the caption sits above it and the photo is not shrunk;
  - reduced motion: no zoom, no fade, no rise;
  - the upload page `/` keeps its own colours, in light and dark system mode.
- **PR B**
  - the controls are one pill with dividers; the selected view and pace are filled chips;
  - the strip has no scrollbar; the current thumbnail is ringed in amber and slightly larger;
  - while the slideshow runs with the strip open, the current thumbnail stays centred, and the photo above does not move;
  - hovering the strip icon shows "Vignettes"; hidden controls still cannot be tabbed to.
- **PR C**
  - the contact sheet has margins, the first row is clear of the pill, names sit on the photos, hover zooms a tile;
  - back to the sheet from a photo: that photo has the amber ring;
  - a photo sent while someone uses the frame: the amber badge slides in with a pulsing dot; with a screen reader (or the Accessibility tree), the count is announced;
  - with no photo in the database: the empty state shows the icon, the waiting line and the host to send from.

## Delivery

On top of the frame slideshow stack, once it is rebased on `develop` (Photo `thumbnailUrl`):

1. This spec and its plan
2. PR A, `feat/frame-photo-backdrop`: backdrop, caption, Ken Burns, slower slide, frame palette
3. PR B, `feat/frame-controls-pill`: glass pill, floating strip polish
4. PR C, `feat/frame-sheet-polish`: contact sheet, badge, empty state
