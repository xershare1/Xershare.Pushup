import { useAuth } from '@clerk/react'
import { useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'

import { checkAdminAccess } from '../../api/admin'
import { isMockApiEnabled } from '../../api/config'
import { PageLoading } from '../ui/PageLoading'

type Props = {
  children: React.ReactNode
}

function LoadingAccess() {
  return (
    <section className="stack narrow">
      <PageLoading pageDensity="tight" message="Checking access…" />
    </section>
  )
}

/**
 * Only mounts when the user is signed in and not on mock API — so `allowed` is
 * only set from the async `checkAdminAccess` callback (no sync setState in effects).
 */
function AdminAccessGate({ children }: { children: React.ReactNode }) {
  const { getToken } = useAuth()
  const [allowed, setAllowed] = useState<boolean | null>(null)

  useEffect(() => {
    let cancelled = false
    void checkAdminAccess(getToken).then((ok) => {
      if (!cancelled) setAllowed(ok)
    })
    return () => {
      cancelled = true
    }
  }, [getToken])

  if (allowed === null) {
    return <LoadingAccess />
  }
  if (!allowed) {
    return <Navigate to="/" replace />
  }
  return <>{children}</>
}

/**
 * Renders children only when the signed-in user is allowlisted on the API
 * (ADMIN_CLERK_USER_IDS). Otherwise redirects home. Mock API mode is never admin.
 */
export function RequireAdmin({ children }: Props) {
  const { isLoaded, isSignedIn } = useAuth()

  if (!isLoaded) {
    return <LoadingAccess />
  }
  if (!isSignedIn || isMockApiEnabled()) {
    return <Navigate to="/" replace />
  }
  return <AdminAccessGate>{children}</AdminAccessGate>
}
