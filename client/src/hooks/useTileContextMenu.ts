import { type MouseEvent, type PointerEvent, useRef, useState } from 'react'

type TileProps = {
  onClick: () => void
  onPointerDown: (event: PointerEvent) => void
  onKeyDown: () => void
  onContextMenu: (event: MouseEvent) => void
}

type MenuProps = { open: boolean; onOpenChange: (isOpen: boolean) => void }

export type TileContextMenu = { tileProps: TileProps; menuProps: MenuProps }

// A long press on Android, Shift+F10 or the menu key fire `contextmenu`: they open the tile's
// photo menu. A mouse keeps the browser's own right-click menu. iOS Safari fires no
// `contextmenu` on a long press: there the « … » is the way. A touch's pointerup goes back to the
// tile (implicit capture), so lifting the finger never picks a menu item under it.
export function useTileContextMenu(onTap: () => void): TileContextMenu {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const isMouse = useRef(false)
  // The click that ends a long press must not also open the photo.
  const isLongPress = useRef(false)
  const tileProps: TileProps = {
    onClick: () => {
      if (!isLongPress.current) onTap()
      isLongPress.current = false
    },
    onPointerDown: (event) => {
      isMouse.current = event.pointerType === 'mouse'
      isLongPress.current = false
    },
    onKeyDown: () => {
      isMouse.current = false
    },
    onContextMenu: (event) => {
      if (isMouse.current) return
      event.preventDefault()
      isLongPress.current = true
      setIsMenuOpen(true)
    },
  }
  return { tileProps, menuProps: { open: isMenuOpen, onOpenChange: setIsMenuOpen } }
}
