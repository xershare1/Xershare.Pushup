import { PushupGuideLayout } from '../../components/PushupGuideLayout'

export function PushupsTrainingPage() {
  return (
    <PushupGuideLayout title="Training & improvement">
      <h2 className="prose-heading">Progression</h2>
      <p>
        <strong>Beginner:</strong> Incline pushups (hands on a bench or wall) or
        knee pushups to build volume with good form.
      </p>
      <p>
        <strong>Intermediate:</strong> Standard pushups for multiple sets at a
        challenging but repeatable rep count; add a slow lower (3-second
        descent) for strength.
      </p>
      <p>
        <strong>Advanced:</strong> Weighted pushups, deficit pushups, or harder
        variations once form stays solid under fatigue.
      </p>
      <h2 className="prose-heading">Simple routine ideas</h2>
      <ul className="prose-list">
        <li>
          <strong>Starter:</strong> 3 sets of as many good reps as possible,
          2–3 times per week, with 1–2 rest days between.
        </li>
        <li>
          <strong>Density:</strong> Every minute on the minute — e.g. 5 pushups
          per minute for 10 minutes; adjust reps to your level.
        </li>
      </ul>
      <p className="prose-note">
        Progress gradually. If your form breaks down, reduce reps or use an
        easier variation.
      </p>
    </PushupGuideLayout>
  )
}
