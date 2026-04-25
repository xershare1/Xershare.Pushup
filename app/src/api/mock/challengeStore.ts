import type { Challenge, CreateChallengeBody, CreateChallengeResponse } from '../../types/challenge'
import { HttpError } from '../httpError'

const STORAGE_KEY = 'pushuppros_mock_challenges_v1'

const memory = new Map<string, Challenge>()

function hydrate(): void {
  if (typeof localStorage === 'undefined') return
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return
    const list = JSON.parse(raw) as Challenge[]
    for (const c of list) {
      if (c.status == null || c.status === '') {
        c.status = 'pending'
      }
      memory.set(c.id, c)
    }
  } catch {
    // ignore corrupt storage
  }
}

function persist(): void {
  if (typeof localStorage === 'undefined') return
  localStorage.setItem(STORAGE_KEY, JSON.stringify([...memory.values()]))
}

export function mockCreateChallenge(body: CreateChallengeBody): CreateChallengeResponse {
  hydrate()
  if (!body.challengerClerkUserId?.trim()) {
    throw new HttpError(400, 'challengerClerkUserId is required')
  }
  const id = crypto.randomUUID()
  const challenge: Challenge = {
    id,
    challengerName: body.challengerName.trim(),
    opponentName: body.opponentName.trim(),
    message: body.message?.trim() || undefined,
    challengerPushups: null,
    opponentPushups: null,
    status: 'proposed',
  }
  if (body.challengerEmail?.trim()) challenge.challengerEmail = body.challengerEmail.trim()
  if (body.opponentEmail?.trim()) challenge.opponentEmail = body.opponentEmail.trim()
  challenge.challengerClerkUserId = body.challengerClerkUserId.trim()
  if (body.opponentClerkUserId?.trim())
    challenge.opponentClerkUserId = body.opponentClerkUserId.trim()
  challenge.gifted = Boolean(body.coverOpponentEntry)
  memory.set(id, challenge)
  persist()
  const origin = typeof window !== 'undefined' ? window.location.origin : ''
  const shareLink = `${origin}/c/${id}?source=invite`
  const notificationSent = Boolean(body.opponentClerkUserId?.trim())
  return { challenge, shareLink, notificationSent, balanceAfter: null }
}

export function mockGetChallenge(id: string): Challenge | undefined {
  hydrate()
  return memory.get(id)
}

export function mockUpsertChallenge(challenge: Challenge): void {
  hydrate()
  memory.set(challenge.id, challenge)
  persist()
}

export function mockListChallengesForClerk(clerkUserId: string): Challenge[] {
  hydrate()
  const c = clerkUserId.trim()
  if (!c) return []
  return [...memory.values()].filter(
    (ch) =>
      (ch.challengerClerkUserId ?? '').trim() === c ||
      (ch.opponentClerkUserId ?? '').trim() === c,
  )
}

function hoursAgo(h: number): string {
  return new Date(Date.now() - h * 3_600_000).toISOString()
}

/**
 * One-time demo pack (PushupPros My challenges brief) when the user has no rows yet.
 * IDs demo-c1 … demo-c8 — skipped if demo-c1 already exists.
 */
export function ensureMyChallengesDemoSeed(clerkSub: string): void {
  hydrate()
  const self = clerkSub.trim()
  if (!self || memory.has('demo-c1')) return

  const expiresSoon = new Date(Date.now() + 62 * 1000).toISOString()

  const demo: Challenge[] = [
    {
      id: 'demo-c1',
      challengerName: 'You',
      opponentName: 'repking',
      challengerClerkUserId: self,
      opponentClerkUserId: 'mock_opp_repking',
      challengerPushups: 21,
      opponentPushups: null,
      status: 'active',
      expiresAt: expiresSoon,
      createdAt: hoursAgo(0.1),
    },
    {
      id: 'demo-c2',
      challengerName: 'ironchest99',
      opponentName: 'You',
      challengerClerkUserId: 'mock_ironchest99',
      opponentClerkUserId: self,
      challengerPushups: null,
      opponentPushups: null,
      status: 'proposed',
      createdAt: hoursAgo(0.5),
    },
    {
      id: 'demo-c3',
      challengerName: 'You',
      opponentName: 'pushuppro22',
      challengerClerkUserId: self,
      opponentClerkUserId: 'mock_opp_p22a',
      challengerPushups: null,
      opponentPushups: null,
      status: 'pending',
      createdAt: hoursAgo(2),
    },
    {
      id: 'demo-c4',
      challengerName: 'You',
      opponentName: 'Tester',
      challengerClerkUserId: self,
      opponentClerkUserId: 'mock_opp_tester',
      challengerPushups: null,
      opponentPushups: null,
      status: 'pending',
      createdAt: hoursAgo(5),
    },
    {
      id: 'demo-c5',
      challengerName: 'You',
      opponentName: 'pushuppro22',
      challengerClerkUserId: self,
      opponentClerkUserId: 'mock_opp_p22b',
      challengerPushups: null,
      opponentPushups: null,
      status: 'pending',
      createdAt: hoursAgo(8),
    },
    {
      id: 'demo-c6',
      challengerName: 'You',
      opponentName: 'fitmachine',
      challengerClerkUserId: self,
      opponentClerkUserId: 'mock_opp_fm',
      challengerPushups: 32,
      opponentPushups: 21,
      status: 'completed',
      createdAt: hoursAgo(30),
    },
    {
      id: 'demo-c7',
      challengerName: 'You',
      opponentName: 'grindmode',
      challengerClerkUserId: self,
      opponentClerkUserId: 'mock_opp_gm',
      challengerPushups: 19,
      opponentPushups: 38,
      status: 'completed',
      createdAt: hoursAgo(48),
    },
    {
      id: 'demo-c8',
      challengerName: 'pushuppro22',
      opponentName: 'You',
      challengerClerkUserId: 'mock_opp_p22c',
      opponentClerkUserId: self,
      challengerPushups: 32,
      opponentPushups: 21,
      status: 'completed',
      createdAt: hoursAgo(72),
    },
  ]

  for (const ch of demo) {
    memory.set(ch.id, ch)
  }
  persist()
}
