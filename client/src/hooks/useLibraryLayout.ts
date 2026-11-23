import { useState } from 'react'

export type LibraryLayout = 'grid' | 'list'

const STORAGE_KEY = 'familyframe.libraryLayout'
const DEFAULT_LAYOUT: LibraryLayout = 'grid'

export function isLibraryLayout(value: unknown): value is LibraryLayout {
  return value === 'grid' || value === 'list'
}

// localStorage throws when the browser blocks site data: the default still works.
function readStoredLayout(): LibraryLayout {
  try {
    const storedLayout = localStorage.getItem(STORAGE_KEY)
    return isLibraryLayout(storedLayout) ? storedLayout : DEFAULT_LAYOUT
  } catch {
    return DEFAULT_LAYOUT
  }
}

function storeLayout(layout: LibraryLayout): void {
  try {
    localStorage.setItem(STORAGE_KEY, layout)
  } catch {
    // Not remembered on this device: the choice still holds until the page reloads.
  }
}

export function useLibraryLayout(): [LibraryLayout, (layout: LibraryLayout) => void] {
  // A function, not its result: storage is read on the first render only.
  const [layout, setLayout] = useState(readStoredLayout)

  function changeLayout(nextLayout: LibraryLayout): void {
    setLayout(nextLayout)
    storeLayout(nextLayout)
  }

  return [layout, changeLayout]
}
