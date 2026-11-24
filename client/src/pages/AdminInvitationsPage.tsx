import { type JSX, useState } from 'react'
import { BackToLibraryLink } from '@/components/admin/BackToLibraryLink.tsx'
import { InvitationForm } from '@/components/admin/InvitationForm.tsx'
import { InvitationLink } from '@/components/admin/InvitationLink.tsx'
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card.tsx'
import { invitationLink } from '@/invitation.ts'

export default function AdminInvitationsPage(): JSX.Element {
  // Only in memory: the server never shows the token again, a reload hides the link.
  const [link, setLink] = useState<string | null>(null)

  return (
    <main className="mx-auto max-w-md px-4 py-10">
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">Invitations</CardTitle>
          <CardDescription>Créez un lien pour inviter un proche dans FamilyFrame.</CardDescription>
          <CardAction>
            <BackToLibraryLink />
          </CardAction>
        </CardHeader>
        <CardContent className="flex flex-col gap-6">
          <InvitationForm onCreated={({ token }) => setLink(invitationLink(token))} />
          {link && <InvitationLink link={link} />}
        </CardContent>
      </Card>
    </main>
  )
}
