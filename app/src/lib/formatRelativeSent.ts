/**
 * "Sent …" labels for friend invitation rows (past times relative to now).
 */
export function formatSentRelative(iso: string): string {
  const rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto' })
  const diffMs = new Date(iso).getTime() - Date.now()

  const sec = Math.round(diffMs / 1000)
  const min = Math.round(diffMs / 60_000)
  const hr = Math.round(diffMs / 3_600_000)
  const day = Math.round(diffMs / 86_400_000)
  const week = Math.round(diffMs / (7 * 86_400_000))
  const month = Math.round(diffMs / (30 * 86_400_000))
  const year = Math.round(diffMs / (365 * 86_400_000))

  const abs = Math.abs(diffMs)
  if (abs < 60_000) return `Sent ${rtf.format(sec, 'second')}`
  if (abs < 3_600_000) return `Sent ${rtf.format(min, 'minute')}`
  if (abs < 86_400_000) return `Sent ${rtf.format(hr, 'hour')}`
  if (abs < 7 * 86_400_000) return `Sent ${rtf.format(day, 'day')}`
  if (abs < 30 * 86_400_000) return `Sent ${rtf.format(week, 'week')}`
  if (abs < 365 * 86_400_000) return `Sent ${rtf.format(month, 'month')}`
  return `Sent ${rtf.format(year, 'year')}`
}

/** Outgoing invitation row meta per PushupPros brief. */
export function formatOutgoingInvitationMeta(iso: string): string {
  return `${formatSentRelative(iso)} · awaiting response`
}
