import {
  ELBOW_GAUGE_DEG,
  ELBOW_GAUGE_GUIDE_DEGS,
  elbowDegToGaugeTopPercent,
} from '../lib/pose/pushupAngleGauge'

type Props = {
  /** Current normalized elbow angle (°); marker hidden when null. */
  angleDeg: number | null
  /** When false, show track + guides only (no current-angle dot). */
  showMarker: boolean
}

/**
 * Lab-only vertical elbow gauge: guides at `UP_ELBOW_DEG.min` and `DOWN_ELBOW_DEG.max` (rep transition band).
 */
export function PushupLabAngleGauge({ angleDeg, showMarker }: Props) {
  return (
    <div className="pushup-lab-angle-gauge" aria-hidden>
      <div className="pushup-lab-angle-gauge-track">
        {ELBOW_GAUGE_GUIDE_DEGS.map((deg) => (
          <div
            key={deg}
            className="pushup-lab-angle-gauge-guide"
            style={{ top: `${elbowDegToGaugeTopPercent(deg)}%` }}
          >
            <span className="pushup-lab-angle-gauge-guide-label">{deg}°</span>
          </div>
        ))}
        {showMarker && angleDeg != null ? (
          <div
            className="pushup-lab-angle-gauge-marker"
            style={{ top: `${elbowDegToGaugeTopPercent(angleDeg)}%` }}
            title={`${angleDeg}°`}
          />
        ) : null}
      </div>
      <div className="pushup-lab-angle-gauge-axis">
        <span>{ELBOW_GAUGE_DEG.max}°</span>
        <span>{ELBOW_GAUGE_DEG.min}°</span>
      </div>
    </div>
  )
}
