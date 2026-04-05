import { useAuth } from '@clerk/react'
import { useEffect, useRef } from 'react'

import { syncUser } from '../api/users'

/**
 * After sign-in, ensure the backend has a local users row enriched from Clerk (POST /users/sync).
 * Runs at most once per browser session per mount tree.
 */
export function UserSyncGate() {
  const { isSignedIn, getToken } = useAuth()
  const didSync = useRef(false)

  useEffect(() => {
    if (!isSignedIn) {
      didSync.current = false
      return
    }
    if (didSync.current) return
    didSync.current = true

    void (async () => {
      try {
        await syncUser(getToken)
      } catch (e) {
        console.warn('[UserSyncGate] sync failed', e)
      }
    })()
  }, [isSignedIn, getToken])

  return null
}
