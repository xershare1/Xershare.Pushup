/** Short copy for post-set celebration (solo session results). */
export function getWorkoutFeedback(reps: number): string {
  if (reps <= 0) return "Every rep counts — you've got this."
  if (reps < 15) return 'Nice work.'
  if (reps < 30) return 'Strong set.'
  return 'Outstanding work.'
}

export function getSoloResultsFeedbackLine(
  reps: number,
  opts: { isNewPersonalBest: boolean; isBestInLast7Days: boolean },
): string {
  if (opts.isNewPersonalBest) {
    return 'Strong session — new personal best for your solo sets.'
  }
  if (opts.isBestInLast7Days && reps > 0) {
    return "Strong session — that's your highest rep count in the last 7 days."
  }
  return getWorkoutFeedback(reps)
}
