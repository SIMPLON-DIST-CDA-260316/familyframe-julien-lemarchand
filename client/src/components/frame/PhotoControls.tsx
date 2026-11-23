import type { ComponentProps, JSX } from 'react'
import { ControlsDivider } from '@/components/frame/ControlsDivider.tsx'
import { DeletePhotoButton } from '@/components/frame/DeletePhotoButton.tsx'
import { SlideshowControls } from '@/components/frame/SlideshowControls.tsx'
import { StripToggle } from '@/components/frame/StripToggle.tsx'
import type { Photo } from '@/photo.ts'

type PhotoControlsProps = {
  photo: Photo
  isStripVisible: boolean
  onStripVisibleChange: (isStripVisible: boolean) => void
  slideshow: ComponentProps<typeof SlideshowControls>
}

// The pill controls that only make sense while a single photo is on screen.
export function PhotoControls({
  photo,
  isStripVisible,
  onStripVisibleChange,
  slideshow,
}: PhotoControlsProps): JSX.Element {
  return (
    <>
      <ControlsDivider />
      <StripToggle isStripVisible={isStripVisible} onStripVisibleChange={onStripVisibleChange} />
      <ControlsDivider />
      <SlideshowControls {...slideshow} />
      <ControlsDivider />
      <DeletePhotoButton photo={photo} />
    </>
  )
}
