import { type ClerkGetToken } from './client'
import { isMockApiEnabled } from './config'
import {
  MOCK_CHALLENGE_LOG,
  MOCK_DEEP_STATS,
  MOCK_HEAD_TO_HEAD,
  MOCK_HEATMAP,
  MOCK_SOLO_SESSIONS,
  MOCK_TREND_12W,
  MOCK_TREND_30D,
  type MockChallengeLogRow,
  type MockSoloSessionRow,
} from './mock/statsMockData'

export type StatsPeriod = '7d' | '30d' | '3mo' | 'all'

export type StatsDeepRow = {
  improvementReps: number
  longestStreak: number
  consistencyPct: number
  avgRepTimeSeconds: number
  avgRepTimeDeltaSeconds: number
}

export type StatsHeadToHeadRow = {
  opponent: string
  initials: string
  wins: number
  losses: number
  bestScore: number
}

export type StatsHeatmapModel = {
  weeks: number
  days: readonly string[]
  data: number[][]
}

export type StatsSoloSessionRow = MockSoloSessionRow

export type StatsChallengeLogRow = MockChallengeLogRow

export type StatsPageModel = {
  period: StatsPeriod
  deep: StatsDeepRow
  trendValues: number[]
  trendMode: '7d' | '30d' | '12w'
  trendWeekLabels: string[]
  headToHead: StatsHeadToHeadRow[]
  heatmap: StatsHeatmapModel
  soloSessions: StatsSoloSessionRow[]
  challengeLog: StatsChallengeLogRow[]
}

function periodStart(period: StatsPeriod, now: Date): Date | null {
  const d = new Date(now)
  if (period === 'all') return null
  if (period === '7d') {
    d.setDate(d.getDate() - 7)
    return d
  }
  if (period === '30d') {
    d.setDate(d.getDate() - 30)
    return d
  }
  if (period === '3mo') {
    d.setMonth(d.getMonth() - 3)
    return d
  }
  return d
}

function filterByPeriod<T extends { date: string }>(rows: T[], period: StatsPeriod, now: Date): T[] {
  const start = periodStart(period, now)
  if (!start) return [...rows]
  return rows.filter((r) => new Date(r.date) >= start)
}

function buildWeekLabelsFor30(count: number, now: Date): string[] {
  const out: string[] = []
  const step = Math.max(1, Math.floor(count / 5))
  for (let i = 0; i < count; i += step) {
    const dt = new Date(now)
    dt.setDate(dt.getDate() - (count - 1 - i))
    out.push(dt.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }))
  }
  while (out.length < 5) out.push('')
  return out.slice(0, 5)
}

function buildMockStatsPage(period: StatsPeriod, now = new Date()): StatsPageModel {
  let trendValues: number[]
  let trendMode: '7d' | '30d' | '12w'
  let trendWeekLabels: string[]

  if (period === '7d') {
    trendValues = MOCK_TREND_30D.slice(-7)
    trendMode = '7d'
    trendWeekLabels = buildWeekLabelsFor30(7, now)
  } else if (period === '3mo') {
    trendValues = [...MOCK_TREND_12W]
    trendMode = '12w'
    trendWeekLabels = ['W1', 'W4', 'W8', 'W12', 'Now']
  } else {
    trendValues = [...MOCK_TREND_30D]
    trendMode = '30d'
    trendWeekLabels = buildWeekLabelsFor30(30, now)
  }

  return {
    period,
    deep: { ...MOCK_DEEP_STATS },
    trendValues,
    trendMode,
    trendWeekLabels,
    headToHead: MOCK_HEAD_TO_HEAD.map((r) => ({ ...r })),
    heatmap: {
      weeks: MOCK_HEATMAP.weeks,
      days: [...MOCK_HEATMAP.days],
      data: MOCK_HEATMAP.data.map((row) => [...row]),
    },
    soloSessions: filterByPeriod(MOCK_SOLO_SESSIONS, period, now),
    challengeLog: filterByPeriod(MOCK_CHALLENGE_LOG, period, now),
  }
}

function emptyPage(period: StatsPeriod): StatsPageModel {
  return {
    period,
    deep: {
      improvementReps: 0,
      longestStreak: 0,
      consistencyPct: 0,
      avgRepTimeSeconds: 0,
      avgRepTimeDeltaSeconds: 0,
    },
    trendValues: [],
    trendMode: '30d',
    trendWeekLabels: [],
    headToHead: [],
    heatmap: { weeks: 0, days: [], data: [] },
    soloSessions: [],
    challengeLog: [],
  }
}

export async function fetchStatsPage(
  _getToken: ClerkGetToken,
  period: StatsPeriod,
): Promise<StatsPageModel> {
  void _getToken
  if (isMockApiEnabled()) {
    return buildMockStatsPage(period)
  }
  return emptyPage(period)
}
