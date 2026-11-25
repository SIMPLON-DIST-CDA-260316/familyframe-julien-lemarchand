import type { JSX } from 'react'
import { Label } from '@/components/ui/label.tsx'

// The server's limit: the field stops there, so the 400 never shows in practice.
export const MAX_MESSAGE_LENGTH = 200

type ShareMessageFieldProps = {
  message: string
  isDisabled: boolean
  onMessageChange: (message: string) => void
}

// The classes of ui/input.tsx, with a height for three lines instead of one.
const TEXTAREA_CLASSES =
  'min-h-20 w-full min-w-0 resize-none rounded-lg border border-input bg-transparent px-2.5 py-2 text-base transition-colors outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm dark:bg-input/30'

export function ShareMessageField({
  message,
  isDisabled,
  onMessageChange,
}: ShareMessageFieldProps): JSX.Element {
  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor="share-message">Message (facultatif)</Label>
      <textarea
        id="share-message"
        className={TEXTAREA_CLASSES}
        rows={3}
        maxLength={MAX_MESSAGE_LENGTH}
        placeholder="Un mot pour accompagner la photo"
        aria-describedby="share-message-count"
        disabled={isDisabled}
        value={message}
        onChange={(event) => onMessageChange(event.target.value)}
      />
      <p id="share-message-count" className="self-end text-xs text-muted-foreground tabular-nums">
        {message.length} / {MAX_MESSAGE_LENGTH}
      </p>
    </div>
  )
}
