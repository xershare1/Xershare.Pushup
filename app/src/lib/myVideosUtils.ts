import type { SoloSessionListItem } from '../api/solo'

export const MS_HOUR = 60 * 60 * 1000
export const MS_DAY = 24 * MS_HOUR

/** Monday 00:00 local time for the week containing `d`. */
export function startOfWeekMonday(d: Date): Date {
  const x = new Date(d)
  const day = x.getDay()
  const diff = day === 0 ? -6 : 1 - day
  x.setDate(x.getDate() + diff)
  x.setHours(0, 0, 0, 0)
  return x
}

/** Mon = 0 … Sun = 6 */
export function dayIndexMondayFirst(d: Date): number {
  const day = d.getDay()
  return day === 0 ? 6 : day - 1
}

export function weekRepBucketsFromSessions(
  sessions: Pick<SoloSessionListItem, 'createdAt' | 'reps'>[],
  now: Date,
): number[] {
  const buckets = [0, 0, 0, 0, 0, 0, 0]
  const weekStart = startOfWeekMonday(now).getTime()
  const weekEnd = weekStart + 7 * MS_DAY

  for (const s of sessions) {
    const t = new Date(s.createdAt).getTime()
    if (t < weekStart || t >= weekEnd) continue
    const idx = dayIndexMondayFirst(new Date(s.createdAt))
    buckets[idx]! += s.reps
  }
  return buckets
}

export function msUntilExpiry(expiresAtIso: string, now: Date): number {
  return new Date(expiresAtIso).getTime() - now.getTime()
}

/** Recording exists and expires within (0, 24h]. */
export function isVideoExpiringSoon(s: SoloSessionListItem, now: Date): boolean {
  if (!s.videoUrl) return false
  const ms = msUntilExpiry(s.expiresAt, now)
  return ms > 0 && ms <= MS_DAY
}

export function expiringVideoSessions(sessions: SoloSessionListItem[], now: Date): SoloSessionListItem[] {
  return sessions.filter((s) => isVideoExpiringSoon(s, now))
}

/** Soonest expiresAt among given sessions (non-empty). */
export function soonestSession(sessions: SoloSessionListItem[]): SoloSessionListItem {
  return [...sessions].sort(
    (a, b) => new Date(a.expiresAt).getTime() - new Date(b.expiresAt).getTime(),
  )[0]!
}

export function formatSessionCardDate(iso: string): string {
  try {
    const d = new Date(iso)
    const datePart = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(d)
    const timePart = new Intl.DateTimeFormat('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    }).format(d)
    return `${datePart} · ${timePart}`
  } catch {
    return iso
  }
}

export function formatExpiresCalendarDay(iso: string): string {
  try {
    return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(new Date(iso))
  } catch {
    return iso
  }
}

/** Hours for banner: at least 1 when any time remains within 24h. */
export function hoursRemainingForCopy(ms: number): number {
  if (ms <= 0) return 0
  return Math.max(1, Math.ceil(ms / MS_HOUR))
}

/** Index of bar to highlight (orange), or -1 if all zeros. */
export function chartHighlightIndex(buckets: number[], todayMondayIndex: number): number {
  const maxVal = Math.max(...buckets)
  if (maxVal <= 0) return -1
  const maxIndices = buckets.map((v, i) => (v === maxVal ? i : -1)).filter((i) => i >= 0)
  if (maxIndices.includes(todayMondayIndex)) return todayMondayIndex
  return maxIndices[0]!
}

export type VideoFilter = 'all' | 'video' | 'repsOnly'

export function filterSessions(
  sessions: SoloSessionListItem[],
  f: VideoFilter,
): SoloSessionListItem[] {
  if (f === 'all') return sessions
  if (f === 'video') return sessions.filter((s) => Boolean(s.videoUrl))
  return sessions.filter((s) => !s.videoUrl)
}

export function deriveStats(sessions: SoloSessionListItem[]) {
  const totalSessions = sessions.length
  let totalReps = 0
  let sessionsWithVideo = 0
  let personalBest = 0
  for (const s of sessions) {
    totalReps += s.reps
    if (s.videoUrl) sessionsWithVideo += 1
    if (s.reps > personalBest) personalBest = s.reps
  }
  const avgRepsPerSet = totalSessions > 0 ? Math.round((totalReps / totalSessions) * 10) / 10 : 0
  return {
    totalSessions,
    totalReps,
    sessionsWithVideo,
    personalBest,
    avgRepsPerSet,
  }
}
