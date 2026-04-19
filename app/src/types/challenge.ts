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
}

export type CreateChallengeResponse = {
  challenge: Challenge
  shareLink: string
  notificationSent: boolean
}

export type SubmitAttemptBody = {
  participantName: string
  pushupCount: number
  role: ParticipantRole
  /** Optional recording; uploaded only on submit (multipart). */
  video?: Blob
}

export type ChallengeVideoItem = {
  challengeId: string
  role: ParticipantRole
  pushupCount: number
  submittedAt: string
  videoUrl: string | null
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
}
