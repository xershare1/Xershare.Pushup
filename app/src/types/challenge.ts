export type ParticipantRole = 'challenger' | 'opponent'

export type CreateChallengeBody = {
  challengerName: string
  opponentName: string
  message?: string
  /** Display only; not used for automated email */
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
