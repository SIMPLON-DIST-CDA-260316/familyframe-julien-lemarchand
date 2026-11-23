import type { JSX } from 'react'
import { Navigate, useLocation } from 'react-router'
import { useAuth } from '@/auth/AuthContext.ts'
import { LoginForm } from '@/components/auth/LoginForm.tsx'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card.tsx'

const HOME_PATH = '/'

// RequireAuth stores the page the user asked for; otherwise the upload page.
function requestedPath(state: unknown): string {
  if (
    typeof state === 'object' &&
    state !== null &&
    'from' in state &&
    typeof state.from === 'string'
  ) {
    return state.from
  }
  return HOME_PATH
}

export default function LoginPage(): JSX.Element | null {
  const { user, isLoading, login } = useAuth()
  const location = useLocation()

  // A logged-in user must not see the form flash while /api/auth/me answers.
  if (isLoading) return null
  // Also right after a successful login: setting the user re-renders this page.
  if (user !== null) return <Navigate to={requestedPath(location.state)} replace />

  return (
    <main className="mx-auto max-w-md px-4 py-10">
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">FamilyFrame</CardTitle>
          <CardDescription>
            Connectez-vous pour envoyer des photos et voir le cadre.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <LoginForm onLogin={login} />
        </CardContent>
      </Card>
    </main>
  )
}
