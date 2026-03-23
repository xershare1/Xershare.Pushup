import type { Challenge, CreateChallengeBody } from '../../types/challenge'

const STORAGE_KEY = 'pushuppros_mock_challenges_v1'

const memory = new Map<string, Challenge>()

function hydrate(): void {
  if (typeof localStorage === 'undefined') return
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return
    const list = JSON.parse(raw) as Challenge[]
    for (const c of list) {
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

export function mockCreateChallenge(body: CreateChallengeBody): Challenge {
  hydrate()
  const id = crypto.randomUUID()
  const challenge: Challenge = {
    id,
    challengerName: body.challengerName.trim(),
    opponentName: body.opponentName.trim(),
    message: body.message?.trim() || undefined,
    challengerPushups: null,
    opponentPushups: null,
  }
  memory.set(id, challenge)
  persist()
  return challenge
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
