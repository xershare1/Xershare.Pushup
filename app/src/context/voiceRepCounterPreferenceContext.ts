import { createContext } from 'react'

export type VoiceRepCounterPreferenceContextValue = {
  voiceRepCounterEnabled: boolean
  loading: boolean
  refresh: () => Promise<void>
  setVoiceRepCounterEnabled: (value: boolean) => Promise<void>
}

export const VoiceRepCounterPreferenceContext = createContext<VoiceRepCounterPreferenceContextValue | null>(
  null,
)
