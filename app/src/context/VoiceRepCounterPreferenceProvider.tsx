import { useAuth } from '@clerk/react'
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'

import { patchVoiceRepCounterPreference, syncUser } from '../api/users'
import { VoiceRepCounterPreferenceContext } from './voiceRepCounterPreferenceContext'

export function VoiceRepCounterPreferenceProvider({ children }: { children: ReactNode }) {
  const { isSignedIn, getToken } = useAuth()
  const [voiceRepCounterEnabled, setVoiceRepCounterEnabledState] = useState(false)
  const [loading, setLoading] = useState(true)
  const persistQueueRef = useRef(Promise.resolve())

  const refresh = useCallback(async () => {
    if (!isSignedIn) {
      setVoiceRepCounterEnabledState(false)
      setLoading(false)
      return
    }
    setLoading(true)
    try {
      const u = await syncUser(getToken)
      setVoiceRepCounterEnabledState(Boolean(u?.voiceRepCounterEnabled))
    } catch {
      setVoiceRepCounterEnabledState(false)
    } finally {
      setLoading(false)
    }
  }, [isSignedIn, getToken])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const setVoiceRepCounterEnabled = useCallback(
    async (value: boolean) => {
      setVoiceRepCounterEnabledState(value)
      const run = persistQueueRef.current.catch(() => {}).then(async () => {
        try {
          await patchVoiceRepCounterPreference(getToken, value)
        } catch {
          await refresh()
        }
      })
      persistQueueRef.current = run
      await run
    },
    [getToken, refresh],
  )

  const value = useMemo(
    () => ({
      voiceRepCounterEnabled,
      loading,
      refresh,
      setVoiceRepCounterEnabled,
    }),
    [voiceRepCounterEnabled, loading, refresh, setVoiceRepCounterEnabled],
  )

  return (
    <VoiceRepCounterPreferenceContext.Provider value={value}>
      {children}
    </VoiceRepCounterPreferenceContext.Provider>
  )
}
