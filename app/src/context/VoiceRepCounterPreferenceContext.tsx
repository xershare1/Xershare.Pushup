import { useAuth } from '@clerk/react'
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'

import { patchVoiceRepCounterPreference, syncUser } from '../api/users'

type VoiceRepCounterPreferenceContextValue = {
  voiceRepCounterEnabled: boolean
  loading: boolean
  refresh: () => Promise<void>
  setVoiceRepCounterEnabled: (value: boolean) => Promise<void>
}

const VoiceRepCounterPreferenceContext = createContext<VoiceRepCounterPreferenceContextValue | null>(
  null,
)

export function VoiceRepCounterPreferenceProvider({ children }: { children: ReactNode }) {
  const { isSignedIn, getToken } = useAuth()
  const [voiceRepCounterEnabled, setVoiceRepCounterEnabledState] = useState(false)
  const [loading, setLoading] = useState(true)

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
      try {
        await patchVoiceRepCounterPreference(getToken, value)
      } catch {
        await refresh()
      }
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

export function useVoiceRepCounterPreference(): VoiceRepCounterPreferenceContextValue {
  const ctx = useContext(VoiceRepCounterPreferenceContext)
  if (!ctx) {
    throw new Error(
      'useVoiceRepCounterPreference must be used within VoiceRepCounterPreferenceProvider',
    )
  }
  return ctx
}
