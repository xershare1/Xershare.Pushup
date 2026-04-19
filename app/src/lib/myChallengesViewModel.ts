import type { Challenge } from '../types/challenge'
import {
  canRespondAsOpponent,
  isChallenger,
  isParticipantByClerk,
} from './challengeParticipation'
import { getLifecycle } from './challengeLifecycle'
import { formatSentRelative } from './formatRelativeSent'

export type MyChallengeFilter = 'all' | 'active' | 'pending' | 'completed'

/** Card row kind for styling and pills. */
export type MyChallengeCardKind =
  | 'live'
  | 'respond'
  | 'video_pending'
  | 'challenger_wait'
  | 'won'
  | 'lost'
  | 'tie'
  | 'declined'
  | 'cancelled'
  | 'expired'

export type MyChallengeSection = 'attention' | 'in_progress' | 'completed'

export type MyChallengeCardModel = {
  challenge: Challenge
  kind: MyChallengeCardKind
  section: MyChallengeSection
  opponentDisplayName: string
  opponentInitials: string
  /** "you challenged" | "vs you" */
  roleTag: 'you challenged' | 'vs you'
  meta: string
  yourScore: number | null
  theirScore: number | null
  youAreWinning: boolean | null
  statusPill: 'Live' | 'Respond' | 'Pending' | 'Won' | 'Lost' | 'Tie' | 'Declined' | 'Cancelled' | 'Expired'
}

function initialsFromDisplayName(name: string): string {
  const t = name.trim()
  if (!t) return '?'
  const parts = t.split(/\s+/).filter(Boolean)
  if (parts.length >= 2) return (parts[0]![0]! + parts[1]![0]!).toUpperCase()
  return t.slice(0, 2).toUpperCase()
}

export function formatLiveMeta(ch: Challenge): string {
  const exp = ch.expiresAt?.trim()
  if (!exp) {
    return 'Live now'
  }
  const end = new Date(exp).getTime()
  if (Number.isNaN(end)) return 'Live now'
  const now = Date.now()
  const sec = Math.max(0, Math.floor((end - now) / 1000))
  const m = Math.floor(sec / 60)
  const s = sec % 60
  const clock = `${m}:${s.toString().padStart(2, '0')}`
  return `Live now — ${clock} remaining`
}

function relativeSnippet(iso: string | undefined | null): string {
  if (!iso?.trim()) return ''
  try {
    return formatSentRelative(iso).replace(/^Sent\s+/i, '')
  } catch {
    return ''
  }
}

/**
 * Filter pills:
 * - **All** — every row.
 * - **Active** — live battles + video-pending (accepted, no result yet).
 * - **Pending** — respond (incoming invite) + challenger waiting on opponent accept.
 * - **Completed** — terminal outcomes (won/lost/tie/declined/cancelled/expired).
 */
export function myChallengeCardMatchesFilter(
  card: MyChallengeCardModel,
  filter: MyChallengeFilter,
): boolean {
  if (filter === 'all') return true
  if (filter === 'completed') {
    return (
      card.kind === 'won' ||
      card.kind === 'lost' ||
      card.kind === 'tie' ||
      card.kind === 'declined' ||
      card.kind === 'cancelled' ||
      card.kind === 'expired'
    )
  }
  if (filter === 'pending') {
    return card.kind === 'respond' || card.kind === 'challenger_wait'
  }
  if (filter === 'active') {
    return card.kind === 'live' || card.kind === 'video_pending'
  }
  return true
}

export function deriveMyChallengeCard(
  ch: Challenge,
  userId: string | undefined,
): MyChallengeCardModel | null {
  if (!userId || !isParticipantByClerk(ch, userId)) return null

  const st = (ch.status ?? '').toLowerCase()
  const life = getLifecycle(ch)
  const iAmChallenger = isChallenger(ch, userId)

  const opponentDisplayName = iAmChallenger ? ch.opponentName : ch.challengerName
  const opponentInitials = initialsFromDisplayName(opponentDisplayName)

  const yourScore = iAmChallenger ? ch.challengerPushups : ch.opponentPushups
  const theirScore = iAmChallenger ? ch.opponentPushups : ch.challengerPushups

  let youAreWinning: boolean | null = null
  if (yourScore !== null && theirScore !== null && life === 'complete') {
    if (yourScore > theirScore) youAreWinning = true
    else if (yourScore < theirScore) youAreWinning = false
    else youAreWinning = null
  }

  const roleTag: 'you challenged' | 'vs you' = iAmChallenger ? 'you challenged' : 'vs you'

  let kind: MyChallengeCardKind
  let section: MyChallengeSection
  let meta: string
  let statusPill: MyChallengeCardModel['statusPill']

  if (st === 'declined') {
    kind = 'declined'
    section = 'completed'
    meta = 'Declined'
    statusPill = 'Declined'
  } else if (st === 'cancelled') {
    kind = 'cancelled'
    section = 'completed'
    meta = 'Cancelled'
    statusPill = 'Cancelled'
  } else if (st === 'expired') {
    kind = 'expired'
    section = 'completed'
    meta = 'Expired'
    statusPill = 'Expired'
  } else if (life === 'complete' || st === 'completed') {
    const y = yourScore ?? 0
    const t = theirScore ?? 0
    const rel = relativeSnippet(ch.createdAt)
    if (y === t) {
      kind = 'tie'
      section = 'completed'
      meta = rel ? `${rel} · tie` : 'Tie game'
      statusPill = 'Tie'
    } else if (y > t) {
      kind = 'won'
      section = 'completed'
      meta = rel ? `${rel} · you won` : 'You won'
      statusPill = 'Won'
    } else {
      kind = 'lost'
      section = 'completed'
      meta = rel ? `${rel} · you lost` : 'You lost'
      statusPill = 'Lost'
    }
  } else if (canRespondAsOpponent(ch, userId)) {
    kind = 'respond'
    section = 'attention'
    meta = 'Waiting for your response · costs 1 credit to accept'
    statusPill = 'Respond'
  } else if (st === 'active') {
    kind = 'live'
    section = 'attention'
    meta = formatLiveMeta(ch)
    statusPill = 'Live'
  } else if (st === 'proposed' && iAmChallenger) {
    kind = 'challenger_wait'
    section = 'in_progress'
    meta = 'Waiting for them to accept your invite'
    statusPill = 'Pending'
  } else if (st === 'pending') {
    kind = 'video_pending'
    section = 'in_progress'
    const tail = relativeSnippet(ch.createdAt)
    meta = tail ? `Awaiting their video · sent ${tail}` : 'Awaiting their video'
    statusPill = 'Pending'
  } else {
    kind = 'video_pending'
    section = 'in_progress'
    meta = 'In progress'
    statusPill = 'Pending'
  }

  return {
    challenge: ch,
    kind,
    section,
    opponentDisplayName,
    opponentInitials,
    roleTag,
    meta,
    yourScore,
    theirScore,
    youAreWinning,
    statusPill,
  }
}

export function buildMyChallengeCards(
  rows: Challenge[],
  userId: string | undefined,
): MyChallengeCardModel[] {
  const out: MyChallengeCardModel[] = []
  for (const ch of rows) {
    const m = deriveMyChallengeCard(ch, userId)
    if (m) out.push(m)
  }
  return out
}

function sectionOrder(s: MyChallengeSection): number {
  if (s === 'attention') return 0
  if (s === 'in_progress') return 1
  return 2
}

function kindOrder(kind: MyChallengeCardKind): number {
  if (kind === 'live') return 0
  if (kind === 'respond') return 1
  return 2
}

/** Stable ordering: urgency sections first; within attention, live before respond; then id desc. */
export function sortMyChallengeCards(cards: MyChallengeCardModel[]): MyChallengeCardModel[] {
  return [...cards].sort((a, b) => {
    const sa = sectionOrder(a.section)
    const sb = sectionOrder(b.section)
    if (sa !== sb) return sa - sb
    if (a.section === 'attention' && b.section === 'attention') {
      const ka = kindOrder(a.kind)
      const kb = kindOrder(b.kind)
      if (ka !== kb) return ka - kb
    }
    return b.challenge.id.localeCompare(a.challenge.id)
  })
}

export function filterMyChallengeCards(
  cards: MyChallengeCardModel[],
  filter: MyChallengeFilter,
): MyChallengeCardModel[] {
  if (filter === 'all') return cards
  return cards.filter((c) => myChallengeCardMatchesFilter(c, filter))
}

export function groupCardsBySection(cards: MyChallengeCardModel[]): {
  attention: MyChallengeCardModel[]
  in_progress: MyChallengeCardModel[]
  completed: MyChallengeCardModel[]
} {
  const attention: MyChallengeCardModel[] = []
  const in_progress: MyChallengeCardModel[] = []
  const completed: MyChallengeCardModel[] = []
  for (const c of cards) {
    if (c.section === 'attention') attention.push(c)
    else if (c.section === 'in_progress') in_progress.push(c)
    else completed.push(c)
  }
  return { attention, in_progress, completed }
}
