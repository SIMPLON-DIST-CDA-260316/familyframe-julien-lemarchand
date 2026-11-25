import type { JSX } from 'react'
import { Alert, AlertDescription } from '@/components/ui/alert.tsx'
import { Badge } from '@/components/ui/badge.tsx'
import type { Invitation, InvitationStatus } from '@/invitation.ts'

type BadgeVariant = 'default' | 'secondary' | 'outline'

const STATUS_BADGES: Record<InvitationStatus, { label: string; variant: BadgeVariant }> = {
  pending: { label: 'En attente', variant: 'default' },
  used: { label: 'Utilisée', variant: 'secondary' },
  expired: { label: 'Expirée', variant: 'outline' },
}

// Same format as photoLabel, kept apart: the two labels may change separately.
function formatDay(isoDate: string): string {
  return new Date(isoDate).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

// A pending link matters by its deadline, a closed one by when it was made.
function invitationDate({ status, createdAt, expiresAt }: Invitation): string {
  if (status === 'pending') return `expire le ${formatDay(expiresAt)}`
  return `créée le ${formatDay(createdAt)}`
}

function InvitationRow({ invitation }: { invitation: Invitation }): JSX.Element {
  const { label, variant } = STATUS_BADGES[invitation.status]
  return (
    <li className="flex items-center justify-between gap-3 py-3">
      <div className="flex min-w-0 flex-col">
        <span className="truncate font-medium">{invitation.email}</span>
        <span className="text-sm text-muted-foreground">{invitationDate(invitation)}</span>
      </div>
      <Badge variant={variant}>{label}</Badge>
    </li>
  )
}

type InvitationListProps = {
  invitations: Invitation[]
  isLoading: boolean
  error: string
}

export function InvitationList({
  invitations,
  isLoading,
  error,
}: InvitationListProps): JSX.Element {
  if (error) {
    return (
      <Alert variant="destructive">
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    )
  }
  if (isLoading) return <p className="text-sm text-muted-foreground">Chargement…</p>
  if (invitations.length === 0) {
    return <p className="text-sm text-muted-foreground">Aucune invitation pour l'instant.</p>
  }
  return (
    <ul className="divide-y">
      {invitations.map((invitation) => (
        <InvitationRow key={invitation.id} invitation={invitation} />
      ))}
    </ul>
  )
}
