# Frame slideshow and animated controls

- Date: 2026-11-23
- Changes: the `/frame` page from [the frame views spec](2026-11-23-frame-views-design.md), step 2 of its roadmap (slideshow), plus an animation on the controls
- AI usage: brainstormed with Claude Code. The author chose the options below; Claude Code proposed the hook split and the CSS-only animation.

## Context

The frame now switches between a single photo and a contact sheet, and reacts to new photos. Two requests follow:

1. The controls appear and disappear abruptly: animate their show and hide.
2. A play/pause button: a static state, and a state where the frame turns from photo to photo on its own.

Choosing the slideshow settings for good (memorised) stays step 4 of the roadmap.

## Decisions

| Question                         | Choice                                                                                               |
| -------------------------------- | ---------------------------------------------------------------------------------------------------- |
| Interval between two photos      | Chosen in the controls: 5 s / 10 s / 20 s, default 10 s. Not memorised (step 4).                     |
| State on load                    | Playing.                                                                                             |
| Someone interacts while playing  | The slideshow waits while `isActive` is true and restarts a full interval once the frame is idle.    |
| End of the list                  | Back to the newest photo.                                                                            |
| Contact sheet                    | Nothing advances; the play/pause state is kept for when the photo view comes back.                   |
| Controls animation               | CSS transition on opacity and a small translate, 300 ms. Hidden controls stay mounted, with `inert`. |
| Building block for the slideshow | Own hook `useSlideshow` on the Embla API. No new dependency.                                         |

### Rejected

- **`embla-carousel-autoplay` plugin**: pause, resume and loop for free, but a new dependency whose logic is less readable than a 20-line hook.
- **`tw-animate-css` enter/exit classes** (already installed): the exit animation needs the controls to stay mounted until it ends, which means delaying the unmount by hand. A CSS transition on always-mounted controls is simpler.

## Components

| File                                 | Change                                                                                                                                                                                  |
| ------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `hooks/useSlideshow.ts`              | New. Given the Embla `api`, `isPlaying` and `intervalMs`: every `intervalMs`, `scrollNext()`, or `scrollTo(0)` on the last photo. Does nothing while not playing.                       |
| `components/frame/PhotoView.tsx`     | Takes `isPlaying` and `intervalMs`, calls `useSlideshow`.                                                                                                                               |
| `components/frame/FrameControls.tsx` | Takes `isVisible`. Always rendered; hidden = `opacity-0` + translate + `pointer-events-none` + `inert`. Adds the play/pause `Toggle` and the 5/10/20 s `ToggleGroup` (photo view only). |
| `pages/FramePage.tsx`                | Holds `isPlaying` (default `true`) and `intervalMs` (default 10 000). Passes `isPlaying && !isActive` to `PhotoView`.                                                                   |

## Behaviour

- **Advance**: through Embla (`scrollNext`), so the slide animates and the move is reported by `select` → `onCurrentChange`, like a swipe. The current photo stays tracked by id; reaching the newest by looping resets the new photos badge, as reaching it by hand does.
- **Pause while active**: `PhotoView` receives `isPlaying && !isActive`. When it turns false the interval is cleared; when it turns true again a new full interval starts.
- **Interval change**: restarts the interval with the new value.
- **New photo while playing and idle**: the existing rule applies (jump to the newest); the slideshow continues from there.
- **One photo**: nothing to advance; `scrollNext` and `scrollTo(0)` are no-ops on a single slide.
- **Controls**: the badge stays outside the controls and keeps its own rendering.

## Verification

The client has no test framework. Each PR runs `pnpm check`, `pnpm typecheck`, `pnpm build`, then a manual check in Chrome:

- controls fade and slide in on input, out after 4 s; hidden controls cannot be tabbed to;
- on load the frame advances every 10 s, from newest to oldest, then back to the newest;
- moving the mouse holds the current photo; once idle, the next advance comes a full interval later;
- pause stops it; play restarts it; 5 s / 20 s change the pace;
- contact sheet: nothing moves; back to photo: the slideshow resumes.

## Delivery

On top of the frame views stack:

1. This spec and its plan
2. Animated controls
3. Slideshow: `useSlideshow`, play/pause, interval choice
