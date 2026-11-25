import { useCallback, useEffect, useRef, useState } from 'react'
import { useAuth } from '@/auth/AuthContext.ts'
import type { Invitation } from '@/invitation.ts'
import { fetchInvitations } from '@/invitationsApi.ts'

export type InvitationList = {
  invitations: Invitation[]
  isLoading: boolean
  error: string
  reload: () => Promise<void>
}

export function useInvitations(): InvitationList {
  const { dropUser } = useAuth()
  const [invitations, setInvitations] = useState<Invitation[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  // Two quick creations start two loads: only the latest one may set the list (step 2 lesson).
  const latestLoadId = useRef(0)

  const reload = useCallback(async (): Promise<void> => {
    latestLoadId.current += 1
    const loadId = latestLoadId.current
    const result = await fetchInvitations(dropUser)
    if (loadId !== latestLoadId.current) return
    setIsLoading(false)
    setError(result.isSuccess ? '' : result.message)
    if (result.isSuccess) setInvitations(result.invitations)
  }, [dropUser])

  useEffect(() => {
    reload()
  }, [reload])

  return { invitations, isLoading, error, reload }
}
