import { LogOutIcon } from 'lucide-react'
import type { JSX } from 'react'
import { useAuth } from '@/auth/AuthContext.ts'
import { Button } from '@/components/ui/button.tsx'

export function LogoutButton(): JSX.Element {
  const { logout } = useAuth()
  return (
    <Button type="button" variant="ghost" size="sm" onClick={logout}>
      <LogOutIcon aria-hidden data-icon="inline-start" />
      Se déconnecter
    </Button>
  )
}
