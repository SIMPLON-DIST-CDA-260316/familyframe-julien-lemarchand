import { type JSX, useState } from 'react'
import { InvitationForm } from '@/components/admin/InvitationForm.tsx'
import { InvitationLink } from '@/components/admin/InvitationLink.tsx'
import { InvitationList } from '@/components/admin/InvitationList.tsx'
import { BackToLibraryLink } from '@/components/library/BackToLibraryLink.tsx'
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card.tsx'
import { useInvitations } from '@/hooks/useInvitations.ts'
import { type CreatedInvitation, invitationLink } from '@/invitation.ts'

function CreationCard({ onCreated }: { onCreated: () => void }): JSX.Element {
  // Only in memory: the server never shows the token again, a reload hides the link.
  const [link, setLink] = useState<string | null>(null)

  function handleCreated({ token }: CreatedInvitation): void {
    setLink(invitationLink(token))
    onCreated()
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl">Invitations</CardTitle>
        <CardDescription>Créez un lien pour inviter un proche dans FamilyFrame.</CardDescription>
        <CardAction>
          <BackToLibraryLink />
        </CardAction>
      </CardHeader>
      <CardContent className="flex flex-col gap-6">
        <InvitationForm onCreated={handleCreated} />
        {link && <InvitationLink link={link} />}
      </CardContent>
    </Card>
  )
}

export default function AdminInvitationsPage(): JSX.Element {
  const { invitations, isLoading, error, reload } = useInvitations()

  return (
    <main className="mx-auto flex max-w-md flex-col gap-8 px-4 py-10">
      <CreationCard onCreated={reload} />
      <Card>
        <CardHeader>
          <CardTitle>Invitations envoyées</CardTitle>
        </CardHeader>
        <CardContent>
          <InvitationList invitations={invitations} isLoading={isLoading} error={error} />
        </CardContent>
      </Card>
    </main>
  )
}
