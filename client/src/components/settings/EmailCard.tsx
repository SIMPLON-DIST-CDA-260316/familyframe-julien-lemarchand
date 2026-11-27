import type { JSX } from 'react'
import { Badge } from '@/components/ui/badge.tsx'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card.tsx'
import { Input } from '@/components/ui/input.tsx'
import { Label } from '@/components/ui/label.tsx'

// Read only: changing the email would need a confirmation by email, which the app cannot send.
// No « Enregistrer » either, there is nothing to save.
export function EmailCard({ email }: { email: string }): JSX.Element {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          Adresse e-mail
          <Badge variant="secondary">Bientôt</Badge>
        </CardTitle>
        <CardDescription>Elle sert à vous connecter et à vous ajouter en ami.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-2">
        <Label htmlFor="email">E-mail</Label>
        <Input id="email" type="email" value={email} disabled readOnly />
      </CardContent>
    </Card>
  )
}
