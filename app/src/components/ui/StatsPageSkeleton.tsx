/**
 * Placeholder layout matching Stats "deep" grid while data loads.
 */
export function StatsPageSkeleton() {
  return (
    <div className="app-stats-skeleton" aria-hidden>
      <div className="app-stats-skeleton__grid">
        <div className="app-skeleton app-skeleton-stat-card" />
        <div className="app-skeleton app-skeleton-stat-card" />
        <div className="app-skeleton app-skeleton-stat-card" />
        <div className="app-skeleton app-skeleton-stat-card" />
      </div>
      <div className="app-skeleton app-skeleton-block" style={{ minHeight: '8rem' }} />
      <div className="app-skeleton app-skeleton-line app-skeleton-line--med" />
    </div>
  )
}
