import type { ReactNode } from 'react'
import { RedirectToSignIn, Show } from '@clerk/react'

/**
 * Session-only routes (pushup flow, submit, result): require Clerk sign-in.
 */
export function RequireSessionAuth({ children }: { children: ReactNode }) {
  return (
    <Show when="signed-in" fallback={<RedirectToSignIn />}>
      {children}
    </Show>
  )
}
