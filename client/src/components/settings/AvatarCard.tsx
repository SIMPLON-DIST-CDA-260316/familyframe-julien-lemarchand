import { type ChangeEvent, type JSX, useState } from 'react'
import { deleteAvatar, putAvatar } from '@/accountApi.ts'
import { UserAvatar } from '@/components/auth/UserAvatar.tsx'
import { SettingsCard } from '@/components/settings/SettingsCard.tsx'
import { Button } from '@/components/ui/button.tsx'
import { Input } from '@/components/ui/input.tsx'
import { Label } from '@/components/ui/label.tsx'
import { type AccountSave, useAccountSave } from '@/hooks/useAccountSave.ts'
import { usePreviewUrl } from '@/hooks/usePreviewUrl.ts'

type AvatarCardProps = { name: string; avatarUrl: string | null }

type AvatarForm = {
  save: AccountSave
  file: File | null
  // A new key remounts the file input, which empties it.
  inputKey: number
  handleFileChange: (event: ChangeEvent<HTMLInputElement>) => void
  clearFile: () => void
  submit: () => Promise<void>
}

function useAvatarForm(): AvatarForm {
  const save = useAccountSave()
  const [file, setFile] = useState<File | null>(null)
  const [inputKey, setInputKey] = useState(0)

  function clearFile(): void {
    setFile(null)
    setInputKey((key) => key + 1)
  }

  async function submit(): Promise<void> {
    if (!file) return
    if (await save.run(() => putAvatar(file))) clearFile()
  }

  return {
    save,
    file,
    inputKey,
    handleFileChange: (event) => setFile(event.target.files?.[0] ?? null),
    clearFile,
    submit,
  }
}

// A chosen file can be dropped before saving; otherwise a saved photo can be removed.
function AvatarActions({
  form,
  hasAvatar,
}: {
  form: AvatarForm
  hasAvatar: boolean
}): JSX.Element | null {
  const isSaving = form.save.status === 'saving'
  if (form.file) {
    return (
      <Button type="button" variant="ghost" disabled={isSaving} onClick={form.clearFile}>
        Annuler
      </Button>
    )
  }
  if (!hasAvatar) return null
  return (
    <Button
      type="button"
      variant="outline"
      disabled={isSaving}
      onClick={async () => {
        await form.save.run(deleteAvatar)
      }}
    >
      Retirer
    </Button>
  )
}

function AvatarFileInput({ form }: { form: AvatarForm }): JSX.Element {
  return (
    <div className="flex min-w-0 flex-1 flex-col gap-2">
      <Label htmlFor="avatar-file">Changer la photo</Label>
      <Input
        key={form.inputKey}
        id="avatar-file"
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={form.handleFileChange}
      />
      <p className="text-xs text-muted-foreground">
        JPEG, PNG ou WebP, 10 Mo au plus. Recadrée en carré, au centre.
      </p>
    </div>
  )
}

export function AvatarCard({ name, avatarUrl }: AvatarCardProps): JSX.Element {
  const form = useAvatarForm()
  // The preview shows what « Enregistrer » would send; the server crops it to a square.
  const previewUrl = usePreviewUrl(form.file)

  return (
    <SettingsCard
      title="Photo de profil"
      description="Elle remplace votre initiale dans le menu et dans la liste d'amis de vos proches."
      save={form.save}
      onSubmit={form.submit}
      isSubmitDisabled={form.file === null}
      extraActions={<AvatarActions form={form} hasAvatar={avatarUrl !== null} />}
    >
      <div className="flex flex-wrap items-center gap-6">
        <UserAvatar name={name} avatarUrl={previewUrl ?? avatarUrl} className="size-24 text-3xl" />
        <AvatarFileInput form={form} />
      </div>
    </SettingsCard>
  )
}
