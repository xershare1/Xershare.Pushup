/** Static demo payload for the Stats page (PushupPros brief). */

export const MOCK_DEEP_STATS = {
  improvementReps: 8,
  longestStreak: 6,
  consistencyPct: 71,
  avgRepTimeSeconds: 2.8,
  /** Positive = slower vs prior (worse), negative = faster (better). */
  avgRepTimeDeltaSeconds: 0.2,
}

export const MOCK_TREND_30D = [
  0, 18, 0, 22, 15, 0, 0, 24, 20, 0, 18, 22, 0, 0, 25, 19, 23, 0, 0, 28, 22, 24, 0, 0, 26, 0, 22, 28, 30, 28,
]

/** 12 weekly totals for 3-month view */
export const MOCK_TREND_12W = [42, 55, 38, 62, 48, 71, 65, 52, 58, 44, 67, 73]

export const MOCK_HEAD_TO_HEAD = [
  { opponent: 'pushuppro22', initials: 'P22', wins: 1, losses: 2, bestScore: 45 },
  { opponent: 'repking', initials: 'RK', wins: 0, losses: 1, bestScore: 21 },
]

export const MOCK_HEATMAP = {
  weeks: 5,
  days: ['M', 'T', 'W', 'T', 'F', 'S', 'S'] as const,
  data: [
    [0, 1, 0, 1, 1, 0, 0],
    [1, 1, 0, 1, 0, 1, 0],
    [0, 1, 1, 0, 1, 1, 0],
    [1, 0, 1, 1, 0, 0, 1],
    [1, 1, 0, 1, 1, 0, 0],
  ] as number[][],
}

export type MockSoloSessionRow = {
  date: string
  reps: number
  durationSecs: number | null
  avgRepSecs: number | null
  hasVideo: boolean
  isPB: boolean
}

export const MOCK_SOLO_SESSIONS: MockSoloSessionRow[] = [
  {
    date: '2026-04-19T00:52:00Z',
    reps: 28,
    durationSecs: 57,
    avgRepSecs: 2.9,
    hasVideo: true,
    isPB: false,
  },
  {
    date: '2026-04-18T21:44:00Z',
    reps: 30,
    durationSecs: 58,
    avgRepSecs: 2.7,
    hasVideo: true,
    isPB: true,
  },
  {
    date: '2026-04-17T15:10:00Z',
    reps: 22,
    durationSecs: null,
    avgRepSecs: null,
    hasVideo: false,
    isPB: false,
  },
  {
    date: '2026-04-15T07:30:00Z',
    reps: 24,
    durationSecs: null,
    avgRepSecs: null,
    hasVideo: false,
    isPB: false,
  },
]

export type MockChallengeLogRow = {
  challengeId: string
  date: string
  opponent: string
  initials: string
  yourScore: number
  theirScore: number
  result: 'win' | 'loss' | 'tie'
}

export const MOCK_CHALLENGE_LOG: MockChallengeLogRow[] = [
  {
    challengeId: 'demo-stats-c1',
    date: '2026-04-18T23:58:00Z',
    opponent: 'pushuppro22',
    initials: 'P22',
    yourScore: 21,
    theirScore: 32,
    result: 'loss',
  },
  {
    challengeId: 'demo-stats-c2',
    date: '2026-04-18T19:54:00Z',
    opponent: 'pushuppro22',
    initials: 'P22',
    yourScore: 23,
    theirScore: 36,
    result: 'loss',
  },
  {
    challengeId: 'demo-stats-c3',
    date: '2026-04-18T18:36:00Z',
    opponent: 'pushuppro22',
    initials: 'P22',
    yourScore: 45,
    theirScore: 35,
    result: 'win',
  },
]
