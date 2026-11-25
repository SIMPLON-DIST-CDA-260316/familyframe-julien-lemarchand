// Dark blurred glass keeps the controls readable over any photo, even a light one.
// The shadcn buttons and toggles stay as generated: the controls restyle them through className.
const GLASS_CLASSES =
  'rounded-full bg-overlay shadow-2xl ring-1 ring-overlay-border backdrop-blur-xl'

export const GLASS_PILL_CLASSES = `${GLASS_CLASSES} flex items-center gap-1 p-1.5`

// A button alone on the photo: ✕, ⋯ and the strip toggle.
export const GLASS_BUTTON_CLASSES = `${GLASS_CLASSES} size-11 text-on-overlay-muted hover:bg-overlay-strong hover:text-on-overlay dark:hover:bg-overlay-strong aria-expanded:bg-overlay-strong aria-expanded:text-on-overlay aria-pressed:bg-overlay-selected aria-pressed:text-on-overlay data-[state=on]:bg-overlay-selected data-[state=on]:text-on-overlay`

// A button inside the glass pill: the pill is the glass, the button only lights up.
export const PILL_BUTTON_CLASSES =
  'size-11 rounded-full text-on-overlay-muted hover:bg-overlay-hover hover:text-on-overlay dark:hover:bg-overlay-hover aria-pressed:bg-overlay-selected aria-pressed:text-on-overlay data-[state=on]:bg-overlay-selected data-[state=on]:text-on-overlay'
