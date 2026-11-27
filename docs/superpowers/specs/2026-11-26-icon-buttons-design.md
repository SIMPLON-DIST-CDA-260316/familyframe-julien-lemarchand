# Icon buttons: one component

Date: 2026-11-26. Follows the « Row action buttons » section of [2026-11-26-page-width-design.md](2026-11-26-page-width-design.md), which matched the « … » case by case with className overrides.

## Problem

Julien, on his phone: the « … » still looked different. The grid tile had a dark 28 px circle, the list row a 44 px rounded square that showed its background under a finger, and the collection's « … » yet another shape. Each fix had been a className on one call site.

## Decisions

| Topic              | Decision                                                                                                                                  | Why                                                                                         |
| ------------------ | ----------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| Component          | `components/actions/IconButton.tsx` wraps the shadcn `Button` and takes `surface: 'page' \| 'photo'`; `aria-label` is required            | one place for the look; a literal union, not a flag                                         |
| Shape and size     | `rounded-full`, 32 px under a mouse and a finger; under `pointer-coarse` an invisible `after:-inset-1.5` gives 44 px                      | the visible circle never changes between devices; the finger still gets WCAG 2.5.5's target |
| `page`             | ghost, `text-muted-foreground`; hover and `aria-expanded` give a `bg-muted` circle and `text-foreground` (the ghost variant's own states) | discreet on the page, clear when active                                                     |
| `photo`            | `bg-overlay`, `text-on-overlay-muted`, `backdrop-blur-sm`; hover and open: `bg-overlay-strong`, `text-on-overlay`                         | only a dark pill stays legible over any photo                                               |
| `MoreButton`       | `IconButton` + `EllipsisIcon`; props and ref reach the button, so `DropdownMenuTrigger asChild` works                                     | React 19 passes `ref` as a prop: no `forwardRef` needed                                     |
| `className`        | only places the button (absolute, a corner); never its look                                                                               | the drift came from looks set at the call site                                              |
| `PhotoActionsMenu` | `className` becomes `trigger`: `{ surface, className? }` renders `MoreButton`; `{ glassClassName }` keeps the control-bar button          | the caller says which family the trigger belongs to, the menu draws it                      |
| Grid tile « … »    | `surface: 'photo'` at `top-1.5 right-1.5`                                                                                                 | hides little of a ~115 px phone tile                                                        |
| Removed            | `ELLIPSIS_CLASSES` (grid tile) and the list row's inline look                                                                             | dead once the component owns the look                                                       |

## Icon-only buttons found

| Where                                                       | Family                    | Now                                  |
| ----------------------------------------------------------- | ------------------------- | ------------------------------------ |
| `PhotoGridTile` « … »                                       | row action, photo surface | `MoreButton surface="photo"`         |
| `PhotoListRow` « … »                                        | row action, page surface  | `MoreButton surface="page"`          |
| `CollectionActions` « … »                                   | row action, page surface  | `MoreButton surface="page"`          |
| `RemoveSendDialog` trash                                    | row action, page surface  | `IconButton surface="page"`          |
| `CollectionList` « + » beside « Collections »               | row action, page surface  | `IconButton surface="page"`          |
| `ViewerTopBar` (close, info, frame, « … »), `SlideshowMenu` | control bar (glass)       | unchanged, out of scope              |
| `frame/CloseButton`, `frame/FullscreenButton`               | control bar (glass)       | unchanged, out of scope              |
| `PhotoInfoPanel` close, `MailRevealDialog` close            | panel and dialog close    | unchanged: they match the panel's ✕  |
| `SendSourcePanel` « Retour »                                | panel navigation          | unchanged: a panel header, not a row |

The control bars (`GLASS_BUTTON_CLASSES`, `VIEWER_BUTTON_CLASSES`) are another family: their buttons must match their neighbours in the bar, so they keep their glass look and size.

## Plan

1. `IconButton` and `MoreButton`.
2. Apply them: `PhotoActionsMenu` `trigger` prop and its four callers, `CollectionActions`, `RemoveSendDialog`, `CollectionList`; R-APP-83 in `apparence-et-navigation.md`.
3. Checks: scoped biome, typecheck, build, test; Chrome 1440 and 360, light and dark.

## AI usage

Claude listed the icon-only buttons, wrote the component and moved the call sites; Julien set the decisions (one shape, one size, two surfaces).
