/** Short copy for post-set celebration (solo session results). */
export function getWorkoutFeedback(reps: number): string {
  if (reps <= 0) return "Every rep counts — you've got this."
  if (reps < 15) return 'Nice work.'
  if (reps < 30) return 'Strong set.'
  return 'Outstanding work.'
}
