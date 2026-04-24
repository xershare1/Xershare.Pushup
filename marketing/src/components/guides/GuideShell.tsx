import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'

export type GuideTocItem = { id: string; label: string }

const DEFAULT_MID = { label: 'Guides', to: '/guides' as const }
const DEFAULT_MOBILE = { label: 'Guides', to: '/guides' as const }

export type GuideShellProps = {
  breadcrumbCurrent: string
  /** Second segment (e.g. Guides or Learn). Defaults to Guides → /guides. */
  breadcrumbMid?: { label: string; to: string }
  /** Mobile-only back row: “← {label}” linking to `to`. Defaults to Guides → /guides. */
  mobileBack?: { label: string; to: string }
  tocItems: GuideTocItem[]
  activeTocId: string
  onTocNavigate: (id: string) => void
  /** Rendered inside the main column before the mobile section pills (e.g. competition alert). */
  beforeMain?: ReactNode
  children: ReactNode
  sidebar: ReactNode
  bottomStrip: ReactNode
}

export function GuideShell({
  breadcrumbCurrent,
  breadcrumbMid = DEFAULT_MID,
  mobileBack = DEFAULT_MOBILE,
  tocItems,
  activeTocId,
  onTocNavigate,
  beforeMain,
  children,
  sidebar,
  bottomStrip,
}: GuideShellProps) {
  return (
    <div className="gdg">
      <div className="gdg-crumb">
        <nav aria-label="Breadcrumb">
          <Link to="/guides">Resources</Link>
          <span className="gdg-crumb__sep" aria-hidden>
            ›
          </span>
          <Link to={breadcrumbMid.to}>{breadcrumbMid.label}</Link>
          <span className="gdg-crumb__sep" aria-hidden>
            ›
          </span>
          <span className="gdg-crumb__current">{breadcrumbCurrent}</span>
        </nav>
      </div>

      <div className="gdg-crumb gdg-crumb--mobile">
        <Link to={mobileBack.to}>← {mobileBack.label}</Link>
      </div>

      <div className="gdg-layout">
        <aside className="gdg-toc" aria-label="On this page">
          <div className="gdg-toc__label">On this page</div>
          <ul className="gdg-toc__list">
            {tocItems.map((item) => (
              <li key={item.id}>
                <button
                  type="button"
                  className={activeTocId === item.id ? 'gdg-toc__link--active' : ''}
                  onClick={() => onTocNavigate(item.id)}
                >
                  {item.label}
                </button>
              </li>
            ))}
          </ul>
        </aside>

        <main className="gdg-main">
          {beforeMain}
          <div className="gdg-pills" aria-label="Sections">
            {tocItems.map((item) => (
              <button
                key={item.id}
                type="button"
                className={activeTocId === item.id ? 'gdg-pills__btn--active' : ''}
                onClick={() => onTocNavigate(item.id)}
              >
                {item.label}
              </button>
            ))}
          </div>

          {children}

          <aside className="gdg-sidebar gdg-sidebar--bottom" aria-label="Guide actions">
            {sidebar}
          </aside>
        </main>

        <aside className="gdg-sidebar" aria-label="Sidebar">
          {sidebar}
        </aside>
      </div>

      {bottomStrip}
    </div>
  )
}
