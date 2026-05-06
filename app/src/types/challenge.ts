export type ParticipantRole = 'challenger' | 'opponent'

export type CreateChallengeBody = {
  challengerName: string
  opponentName: string
  message?: string
  challengerEmail?: string
  opponentEmail?: string
  /** When set, server verifies via Clerk and may email the opponent */
  challengerClerkUserId?: string
  opponentClerkUserId?: string
  /** When true, deduct 2 credits at send; opponent can accept for free. */
  coverOpponentEntry?: boolean
}

export type Challenge = {
  id: string
  challengerName: string
  opponentName: string
  message?: string
  challengerPushups: number | null
  opponentPushups: number | null
  challengerEmail?: string
  opponentEmail?: string
  challengerClerkUserId?: string
  opponentClerkUserId?: string
  /** Server: proposed | pending | active | completed | declined | cancelled | expired */
  status?: string | null
  /** ISO datetime when the challenge window ends (optional; from API). */
  expiresAt?: string | null
  /** Optional creation time for relative meta (mock or future API). */
  createdAt?: string | null
  /** True when challenger paid 2 credits to cover the opponent's entry. */
  gifted?: boolean
}

export type CreateChallengeResponse = {
  challenge: Challenge
  shareLink: string
  notificationSent: boolean
  /** Set when the API deducts credits (Postgres + billing). */
  balanceAfter?: number | null
}

export type SubmitAttemptBody = {
  participantName: string
  pushupCount: number
  role: ParticipantRole
  /** Optional recording; uploaded only on submit (multipart). */
  video?: Blob
}

export type ChallengeVideoOpponent = {
  username: string
  initials: string
}

export type ChallengeVideoResult = 'won' | 'lost' | 'tie'

export type ChallengeVideoItem = {
  id: string
  challengeId: string
  opponent: ChallengeVideoOpponent
  role: ParticipantRole
  result: ChallengeVideoResult
  yourScore: number
  theirScore: number
  recordedAt: string
  expiresAt: string
  videoUrl: string | null
}

export type ChallengeVideoStats = {
  total: number
  wins: number
  losses: number
  bestReps: number
}

export type ChallengeVideosPage = {
  challengeVideos: ChallengeVideoItem[]
  stats: ChallengeVideoStats
}

export type ChallengeOutcome = {
  challengeId: string
  challengerName: string
  opponentName: string
  challengerPushups: number
  opponentPushups: number
  winner: ParticipantRole | 'tie'
}

export type LeaderboardEntry = {
  rank: number
  displayName: string
  bestPushups: number
  wins: number
  ties: number
  losses: number
}
