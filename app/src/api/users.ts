import { jsonFetch } from './client'
import { isMockApiEnabled } from './config'

export type UserSyncResponse = {
  id: string
  clerkUserId: string
  email: string | null
  displayName: string | null
}

/**
 * Upsert local user from Clerk profile (backend calls Clerk GET /v1/users/{id}).
 * Call once after sign-in when DATABASE_URL is configured on the API.
 */
export async function syncUser(getToken: () => Promise<string | null>): Promise<UserSyncResponse | null> {
  if (isMockApiEnabled()) {
    return {
      id: 'mock-user-id',
      clerkUserId: 'mock_clerk',
      email: null,
      displayName: null,
    }
  }

  const token = await getToken()
  if (!token) {
    return null
  }

  return jsonFetch<UserSyncResponse>('/users/sync', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })
}
