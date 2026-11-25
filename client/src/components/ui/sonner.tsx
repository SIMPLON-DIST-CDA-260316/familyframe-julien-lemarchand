import {
  CircleCheckIcon,
  InfoIcon,
  Loader2Icon,
  OctagonXIcon,
  TriangleAlertIcon,
} from 'lucide-react'
import type * as React from 'react'
import { Toaster as Sonner, type ToasterProps } from 'sonner'
import { useAppliedTheme } from '@/hooks/useAppliedTheme.ts'

// Inline, not a class: Sonner's own theme selectors would outrank a utility class.
const THEME_TOKENS: React.CSSProperties & Record<`--${string}`, string> = {
  '--normal-bg': 'var(--popover)',
  '--normal-text': 'var(--popover-foreground)',
  '--normal-border': 'var(--border)',
  '--border-radius': 'var(--radius)',
}

// On a phone, toasts rise above the tab bar and the home bar instead of covering them.
const MOBILE_OFFSET = { bottom: 'calc(var(--tab-bar-height) + env(safe-area-inset-bottom) + 16px)' }

function Toaster({ ...props }: ToasterProps) {
  const theme = useAppliedTheme()

  return (
    <Sonner
      theme={theme}
      className="toaster group"
      icons={{
        success: <CircleCheckIcon className="size-4" />,
        info: <InfoIcon className="size-4" />,
        warning: <TriangleAlertIcon className="size-4" />,
        error: <OctagonXIcon className="size-4" />,
        loading: <Loader2Icon className="size-4 animate-spin" />,
      }}
      style={THEME_TOKENS}
      mobileOffset={MOBILE_OFFSET}
      {...props}
    />
  )
}

export { Toaster }
