const ROWS = 4

/**
 * List-row placeholders for Friends page body while loading.
 */
export function FriendsListSkeleton() {
  return (
    <div className="stack" style={{ gap: '0.65rem' }} aria-hidden>
      {Array.from({ length: ROWS }, (_, i) => (
        <div key={i} className="app-skeleton-row" style={{ padding: '0.5rem 0' }}>
          <div className="app-skeleton app-skeleton-avatar" />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="app-skeleton app-skeleton-line" style={{ marginBottom: 6 }} />
            <div className="app-skeleton app-skeleton-line app-skeleton-line--short" />
          </div>
        </div>
      ))}
    </div>
  )
}
