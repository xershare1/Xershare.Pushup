import { useAuth } from '@clerk/react'
import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'

import { fetchCreditBalance } from '../api/billing'
import { CREDIT_BALANCE_REFRESH_EVENT } from '../lib/creditBalanceRefresh'

/**
 * Shows the signed-in user's credit balance in the header.
 * Refetches when the user signs in, on tab focus (multi-tab), and when
 * {@link requestCreditBalanceRefresh} fires (e.g. after returning from checkout).
 */
export function HeaderCreditBalance() {
  const { isSignedIn, getToken } = useAuth()
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
    const id = window.setTimeout(() => {
      void load()
    }, 0)
    return () => window.clearTimeout(id)
  }, [load])

  useEffect(() => {
    const onRefresh = () => void load()
    window.addEventListener(CREDIT_BALANCE_REFRESH_EVENT, onRefresh)
    return () => window.removeEventListener(CREDIT_BALANCE_REFRESH_EVENT, onRefresh)
  }, [load])

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
