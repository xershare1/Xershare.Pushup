import { PushupGuideLayout } from '../../components/PushupGuideLayout'

export function PushupsRecordsPage() {
  return (
    <PushupGuideLayout title="Records & leaderboard">
      <p>
        World-record style feats (most pushups in a set time, longest marathon
        sets, etc.) appear in news and sports coverage from time to time. Rules
        and verification vary by organization—treat public numbers as
        inspirational, not a substitute for your own safe progression.
      </p>
      <p className="placeholder-note">
        A future version of PushupPros may show app leaderboards here. For now
        this section is informational only.
      </p>
    </PushupGuideLayout>
  )
}
