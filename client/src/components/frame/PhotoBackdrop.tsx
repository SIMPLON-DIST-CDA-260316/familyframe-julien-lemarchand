import type { JSX } from 'react'

type PhotoBackdropProps = {
  url: string
}

export function PhotoBackdrop({ url }: PhotoBackdropProps): JSX.Element {
  return (
    <img
      // The photo's own colours fill the bars around it; scale-125 hides the blur's faded edges.
      className="pointer-events-none absolute inset-0 -z-10 size-full scale-125 object-cover opacity-60 blur-3xl brightness-50 saturate-150 motion-safe:animate-in motion-safe:fade-in motion-safe:duration-1000"
      src={url}
      alt=""
      aria-hidden
    />
  )
}
