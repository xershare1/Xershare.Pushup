import { useAuth } from '@clerk/react'
import { Outlet } from 'react-router-dom'

import { AppShell } from './AppShell'
import { PublicChrome } from './PublicChrome'
import { UserSyncGate } from './UserSyncGate'

export function RootLayout() {
  const { isSignedIn, isLoaded } = useAuth()

  if (!isLoaded) {
    return (
      <div className="layout">
        <main className="main" style={{ padding: '2rem' }} aria-busy="true">
          <p className="muted">Loading…</p>
        </main>
      </div>
    )
  }

  return (
    <>
      <UserSyncGate />
      {isSignedIn ? (
        <AppShell>
          <Outlet />
        </AppShell>
      ) : (
        <PublicChrome>
          <Outlet />
        </PublicChrome>
      )}
    </>
  )
}
