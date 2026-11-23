// Dark blurred glass keeps the controls readable over any photo, even a light one.
// The shadcn buttons and toggles stay as generated: the controls restyle them through className.
const GLASS_CLASSES = 'rounded-full bg-black/45 shadow-2xl ring-1 ring-white/10 backdrop-blur-xl'

export const GLASS_PILL_CLASSES = `${GLASS_CLASSES} flex items-center gap-1 p-1.5`

// A button alone on the photo: ✕, ⋯ and the strip toggle.
export const GLASS_BUTTON_CLASSES = `${GLASS_CLASSES} size-11 text-white/80 hover:bg-black/65 hover:text-white dark:hover:bg-black/65 aria-expanded:bg-black/65 aria-expanded:text-white aria-pressed:bg-white/20 aria-pressed:text-white data-[state=on]:bg-white/20 data-[state=on]:text-white`

// A button inside the glass pill: the pill is the glass, the button only lights up.
export const PILL_BUTTON_CLASSES =
  'size-11 rounded-full text-white/80 hover:bg-white/10 hover:text-white dark:hover:bg-white/10 aria-pressed:bg-white/15 aria-pressed:text-white data-[state=on]:bg-white/15 data-[state=on]:text-white'
