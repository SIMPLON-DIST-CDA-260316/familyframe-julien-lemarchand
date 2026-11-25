import { type ChangeEvent, type JSX, useRef } from 'react'
import { Button } from '@/components/ui/button.tsx'

// The server's accepted types: a HEIC or GIF picked here would only be refused after the upload.
const ACCEPTED_IMAGE_TYPES = 'image/jpeg,image/png,image/webp'

export type PickButtonProps = {
  label: string
  icon: JSX.Element
  capture?: 'environment'
  // The gallery only: the camera takes one photo at a time.
  multiple?: boolean
  onChange: (event: ChangeEvent<HTMLInputElement>) => void
}

// A button rather than the raw file input: the browser's « Choose file » cannot be styled or
// translated. The hidden input does the picking.
export function PickButton({
  label,
  icon,
  capture,
  multiple,
  onChange,
}: PickButtonProps): JSX.Element {
  const inputRef = useRef<HTMLInputElement>(null)
  return (
    <>
      <Button
        type="button"
        variant="outline"
        // pointer-coarse:h-20 beats the Button's coarse h-11: the big tile stays big under a finger.
        className="h-20 flex-col gap-2 whitespace-normal pointer-coarse:h-20"
        onClick={() => inputRef.current?.click()}
      >
        {icon}
        {label}
      </Button>
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED_IMAGE_TYPES}
        capture={capture}
        multiple={multiple}
        className="hidden"
        onChange={onChange}
      />
    </>
  )
}
