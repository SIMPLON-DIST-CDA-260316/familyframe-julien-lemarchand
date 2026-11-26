import type { JSX } from 'react'
import { useNavigate } from 'react-router'
import { CollectionNameDialog } from '@/components/collections/CollectionNameDialog.tsx'
import { libraryPath } from '@/viewerHistory.ts'

type NewCollectionDialogProps = {
  isOpen: boolean
  onClose: () => void
  onCloseAutoFocus?: (event: Event) => void
}

// The new collection opens at once: it is empty, its notice tells how to fill it.
export function NewCollectionDialog({
  isOpen,
  onClose,
  onCloseAutoFocus,
}: NewCollectionDialogProps): JSX.Element {
  const navigate = useNavigate()
  return (
    <CollectionNameDialog
      target={isOpen ? { kind: 'create' } : null}
      onClose={onClose}
      onCloseAutoFocus={onCloseAutoFocus}
      onSaved={(collection) => navigate(libraryPath(collection.id))}
    />
  )
}
