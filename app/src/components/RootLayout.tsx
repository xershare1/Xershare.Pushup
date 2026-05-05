import { useAuth } from '@clerk/react'
import { Outlet } from 'react-router-dom'

import { AppShell } from './AppShell'
import { VoiceRepCounterPreferenceProvider } from '../context/VoiceRepCounterPreferenceContext'
import { PublicChrome } from './PublicChrome'
import { UserSyncGate } from './UserSyncGate'
import { PageLoading } from './ui/PageLoading'

export function RootLayout() {
  const { isSignedIn, isLoaded } = useAuth()

  if (!isLoaded) {
    return (
      <div className="layout">
        <main className="main" style={{ padding: '2rem' }} aria-busy="true">
          <PageLoading pageDensity="tight" message="Loading…" />
        </main>
      </div>
    )
  }

  return (
    <>
      <UserSyncGate />
      {isSignedIn ? (
        <AppShell>
          <VoiceRepCounterPreferenceProvider>
            <Outlet />
          </VoiceRepCounterPreferenceProvider>
        </AppShell>
      ) : (
        <PublicChrome>
          <Outlet />
        </PublicChrome>
      )}
    </>
  )
}
