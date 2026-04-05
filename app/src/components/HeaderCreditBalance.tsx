import { useAuth } from '@clerk/react'
import { useCallback, useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'

import { fetchCreditBalance } from '../api/billing'

/**
 * Shows the signed-in user's credit balance in the header; refreshes on navigation and tab focus.
 */
export function HeaderCreditBalance() {
  const { isSignedIn, getToken } = useAuth()
  const location = useLocation()
  const [balance, setBalance] = useState<number | null>(null)
  const [unavailable, setUnavailable] = useState(false)

  const load = useCallback(async () => {
    if (!isSignedIn) {
      setBalance(null)
      setUnavailable(false)
      return
    }
    setUnavailable(false)
    try {
      const n = await fetchCreditBalance(getToken)
      setBalance(n)
    } catch {
      setBalance(null)
      setUnavailable(true)
    }
  }, [isSignedIn, getToken])

  useEffect(() => {
    void load()
  }, [load, location.pathname])

  useEffect(() => {
    const onVis = () => {
      if (document.visibilityState === 'visible') void load()
    }
    document.addEventListener('visibilitychange', onVis)
    return () => document.removeEventListener('visibilitychange', onVis)
  }, [load])

  if (!isSignedIn) {
    return null
  }

  if (unavailable) {
    return (
      <span className="header-credits header-credits--muted" title="Balance unavailable">
        —
      </span>
    )
  }

  if (balance === null) {
    return (
      <span className="header-credits header-credits--muted" aria-busy="true">
        …
      </span>
    )
  }

  return (
    <Link
      className="header-credits"
      to="/purchase"
      title="View credit packs"
      aria-label={`${balance} credits`}
    >
      <span className="header-credits-value">{balance}</span>
      <span className="header-credits-label">credits</span>
    </Link>
  )
}
