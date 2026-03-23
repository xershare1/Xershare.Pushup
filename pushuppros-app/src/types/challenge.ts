export type ParticipantRole = 'challenger' | 'opponent'

export type CreateChallengeBody = {
  challengerName: string
  opponentName: string
  message?: string
}

export type Challenge = {
  id: string
  challengerName: string
  opponentName: string
  message?: string
  challengerPushups: number | null
  opponentPushups: number | null
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
