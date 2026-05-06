import { useContext } from 'react'

import {
  VoiceRepCounterPreferenceContext,
  type VoiceRepCounterPreferenceContextValue,
} from './voiceRepCounterPreferenceContext'

export function useVoiceRepCounterPreference(): VoiceRepCounterPreferenceContextValue {
  const ctx = useContext(VoiceRepCounterPreferenceContext)
  if (!ctx) {
    throw new Error(
      'useVoiceRepCounterPreference must be used within VoiceRepCounterPreferenceProvider',
    )
  }
  return ctx
}
