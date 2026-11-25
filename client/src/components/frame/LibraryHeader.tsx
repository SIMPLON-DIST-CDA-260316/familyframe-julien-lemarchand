import { PlayIcon } from 'lucide-react'
import type { JSX } from 'react'
import { UserBadge } from '@/components/auth/UserBadge.tsx'
import { LayoutToggle } from '@/components/frame/LayoutToggle.tsx'
import { Button } from '@/components/ui/button.tsx'
import type { LibraryLayout } from '@/hooks/useLibraryLayout.ts'

type LibraryHeaderProps = {
  photoCount: number
  layout: LibraryLayout
  onLayoutChange: (layout: LibraryLayout) => void
  onStartSlideshow: () => void
}

export function LibraryHeader({
  photoCount,
  layout,
  onLayoutChange,
  onStartSlideshow,
}: LibraryHeaderProps): JSX.Element {
  return (
    // z-10: the tiles come later in the page and are positioned, they would scroll over it.
    <header className="fixed inset-x-0 top-0 z-10 flex items-center gap-4 border-b border-white/10 bg-frame-background/80 px-8 py-4 backdrop-blur-xl">
      <h1 className="text-2xl font-medium tracking-tight">
        Photos <span className="text-muted-foreground tabular-nums">· {photoCount}</span>
      </h1>
      <Button
        size="lg"
        onClick={onStartSlideshow}
        className="ml-auto rounded-full bg-frame-accent px-4 text-black hover:bg-frame-accent/85"
      >
        <PlayIcon data-icon="inline-start" />
        Lancer le diaporama
      </Button>
      <LayoutToggle layout={layout} onLayoutChange={onLayoutChange} />
      <UserBadge />
    </header>
  )
}
