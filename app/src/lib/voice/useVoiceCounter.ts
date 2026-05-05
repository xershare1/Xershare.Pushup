import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'

import { resumeSessionAudioContext } from '../audio/sessionAudio'

const PB_SCRIPT = 'New personal best!'

/** Unlock Web Speech + Web Audio after a user gesture (e.g. Start session). */
export function unlockWebSpeechFromUserGesture(): void {
  resumeSessionAudioContext()
  try {
    if (typeof window === 'undefined') return
    const synth = window.speechSynthesis
    if (!synth) return
    const u = new SpeechSynthesisUtterance('')
    synth.speak(u)
    synth.cancel()
  } catch {
    /* optional */
  }
}

function getSynth(): SpeechSynthesis | null {
  if (typeof window === 'undefined') return null
  return window.speechSynthesis ?? null
}

export type UseVoiceCounterOptions = {
  /** Server preference: session audio (voice + timed SFX) enabled */
  settingsEnabled: boolean
  /** PB at session start (solo) or 0 for challenge — read when a rep is announced */
  getPersonalBestAtSessionStart: () => number
}

export type UseVoiceCounterReturn = {
  /** `remainingSec` from active timer; suppresses milestone/PB TTS in the final 10s */
  announceRep: (count: number, remainingSec: number) => void
  cancelAllSpeech: () => void
  /** Session-local mute when settings allow audio */
  sessionVoiceMutedLocal: boolean
  toggleSessionVoiceMute: () => void
}

export function useVoiceCounter({
  settingsEnabled,
  getPersonalBestAtSessionStart,
}: UseVoiceCounterOptions): UseVoiceCounterReturn {
  const settingsRef = useRef(settingsEnabled)
  const sessionVoiceMutedRef = useRef(false)

  const [sessionVoiceMuted, setSessionVoiceMuted] = useState(false)

  useLayoutEffect(() => {
    settingsRef.current = settingsEnabled
    sessionVoiceMutedRef.current = sessionVoiceMuted
  }, [settingsEnabled, sessionVoiceMuted])

  useEffect(() => {
    if (!settingsEnabled) {
      getSynth()?.cancel()
    }
  }, [settingsEnabled])

  useEffect(() => {
    return () => {
      getSynth()?.cancel()
    }
  }, [])

  useEffect(() => {
    const onVis = () => {
      if (document.hidden) getSynth()?.cancel()
    }
    document.addEventListener('visibilitychange', onVis)
    return () => document.removeEventListener('visibilitychange', onVis)
  }, [])

  const speak = useCallback((text: string, priority: boolean) => {
    if (!settingsRef.current || sessionVoiceMutedRef.current) return
    try {
      const synth = getSynth()
      if (!synth) return
      if (priority) synth.cancel()
      const u = new SpeechSynthesisUtterance(text)
      u.rate = 1.0
      u.pitch = 1.0
      u.volume = 1.0
      synth.speak(u)
    } catch {
      /* optional */
    }
  }, [])

  const hasAnnouncedSessionNewBestRef = useRef(false)

  const announceRep = useCallback(
    (count: number, remainingSec: number) => {
      if (!settingsRef.current || sessionVoiceMutedRef.current) return
      if (remainingSec <= 10) return

      const pb = getPersonalBestAtSessionStart()
      if (count <= pb) {
        hasAnnouncedSessionNewBestRef.current = false
      }
      if (pb > 0 && count > pb && !hasAnnouncedSessionNewBestRef.current) {
        hasAnnouncedSessionNewBestRef.current = true
        speak(PB_SCRIPT, true)
        return
      }
      if (count > 0 && count % 10 === 0) {
        speak(String(count), true)
      }
    },
    [speak, getPersonalBestAtSessionStart],
  )

  const cancelAllSpeech = useCallback(() => {
    getSynth()?.cancel()
  }, [])

  const toggleSessionVoiceMute = useCallback(() => {
    if (!settingsRef.current) return
    setSessionVoiceMuted((m) => {
      const next = !m
      if (next) getSynth()?.cancel()
      return next
    })
  }, [])

  return {
    announceRep,
    cancelAllSpeech,
    sessionVoiceMutedLocal: sessionVoiceMuted,
    toggleSessionVoiceMute,
  }
}
