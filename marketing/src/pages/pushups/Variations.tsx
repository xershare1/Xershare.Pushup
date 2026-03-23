import { PushupGuideLayout } from '../../components/PushupGuideLayout'

export function PushupsVariationsPage() {
  return (
    <PushupGuideLayout title="Pushup variations">
      <ul className="prose-list">
        <li>
          <strong>Standard</strong> — Hands under shoulders, full body rigid;
          the baseline for counting reps and comparing progress.
        </li>
        <li>
          <strong>Wide</strong> — Hands wider than shoulders; emphasizes chest
          and places more load on outer chest and shoulders.
        </li>
        <li>
          <strong>Diamond</strong> — Index fingers and thumbs form a diamond;
          shifts emphasis toward triceps and inner chest.
        </li>
        <li>
          <strong>Decline</strong> — Feet elevated on a bench or step; increases
          load on upper chest and shoulders.
        </li>
        <li>
          <strong>Explosive</strong> — Push hard enough to lift hands (e.g.
          clap pushup); builds power; higher injury risk—warm up well.
        </li>
      </ul>
    </PushupGuideLayout>
  )
}
