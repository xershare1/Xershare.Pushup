import { PushupGuideLayout } from '../../components/PushupGuideLayout'

export function PushupsFormPage() {
  return (
    <PushupGuideLayout title="Proper pushup form">
      <h2 className="prose-heading">Body alignment</h2>
      <p>
        Form a straight line from head to heels: brace your core, squeeze
        glutes slightly, and keep your neck neutral (look at the floor a few
        inches ahead of your hands).
      </p>
      <h2 className="prose-heading">Depth</h2>
      <p>
        Lower until your chest is close to the floor without collapsing your
        lower back. If full depth is too hard, elevate your hands on a bench or
        do knee pushups while keeping the same line from knees to head.
      </p>
      <h2 className="prose-heading">Elbow position</h2>
      <p>
        A moderate angle (about 30–45° from your torso) is comfortable for most
        shoulders. Flaring elbows straight out to the sides can stress the
        shoulder joint over time.
      </p>
      <h2 className="prose-heading">Common mistakes</h2>
      <ul className="prose-list">
        <li>Sagging hips or piking hips — fix with a tighter core.</li>
        <li>Partial range — only counting the top half of the rep.</li>
        <li>
          Craning the neck up — keep head in line with the spine.
        </li>
      </ul>
    </PushupGuideLayout>
  )
}
