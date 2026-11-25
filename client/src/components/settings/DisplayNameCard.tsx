import { type JSX, useState } from 'react'
import { patchDisplayName } from '@/accountApi.ts'
import { DISPLAY_NAME_MAX_LENGTH } from '@/auth/accountRules.ts'
import { TextField } from '@/components/form/TextField.tsx'
import { SettingsCard } from '@/components/settings/SettingsCard.tsx'
import { useAccountSave } from '@/hooks/useAccountSave.ts'

export function DisplayNameCard({ displayName }: { displayName: string }): JSX.Element {
  const [name, setName] = useState(displayName)
  const save = useAccountSave()

  return (
    <SettingsCard
      title="Nom affiché"
      description="Vos amis le voient sur les photos que vous leur envoyez."
      save={save}
      onSubmit={async () => {
        await save.run(() => patchDisplayName(name))
      }}
    >
      <TextField
        id="display-name"
        enterKeyHint="done"
        label="Nom"
        type="text"
        autoComplete="name"
        maxLength={DISPLAY_NAME_MAX_LENGTH}
        value={name}
        onChange={setName}
      />
    </SettingsCard>
  )
}
