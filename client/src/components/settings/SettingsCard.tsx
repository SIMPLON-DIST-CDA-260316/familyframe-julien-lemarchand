import type { JSX, ReactNode, SubmitEvent } from 'react'
import { Button } from '@/components/ui/button.tsx'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card.tsx'
import type { AccountSave } from '@/hooks/useAccountSave.ts'

type SettingsCardProps = {
  title: string
  description: string
  save: AccountSave
  onSubmit: () => Promise<void>
  children: ReactNode
  // Buttons next to « Enregistrer », such as « Retirer » on the photo card.
  extraActions?: ReactNode
  isSubmitDisabled?: boolean
}

function SaveFeedback({ save }: { save: AccountSave }): JSX.Element | null {
  if (save.status === 'saved') {
    return (
      <p role="status" className="text-sm text-muted-foreground">
        Enregistré.
      </p>
    )
  }
  if (save.status === 'error') {
    return (
      <p role="alert" className="text-sm text-destructive">
        {save.error}
      </p>
    )
  }
  return null
}

// One form per card: « Enregistrer » sends only that card, the others keep what is typed.
export function SettingsCard({ save, onSubmit, ...props }: SettingsCardProps): JSX.Element {
  async function handleSubmit(event: SubmitEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault()
    await onSubmit()
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{props.title}</CardTitle>
        <CardDescription>{props.description}</CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit} className="flex flex-col gap-6">
        <CardContent className="flex flex-col gap-4">{props.children}</CardContent>
        <CardFooter className="flex flex-wrap items-center justify-end gap-3">
          <SaveFeedback save={save} />
          {props.extraActions}
          <Button type="submit" disabled={save.status === 'saving' || props.isSubmitDisabled}>
            {save.status === 'saving' ? 'Enregistrement…' : 'Enregistrer'}
          </Button>
        </CardFooter>
      </form>
    </Card>
  )
}
