import { useEffect, useId, useRef, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'

import type { ResourceLinkItem } from '../resources-links'
import { RESOURCE_GUIDES, RESOURCE_LEARN } from '../resources-links'

type ResourcesDropdownProps = {
  onNavigate: () => void
}

function pathMatchesCurrent(pathname: string, to: string): boolean {
  const a = pathname.replace(/\/$/, '') || '/'
  const b = to.replace(/\/$/, '') || '/'
  return a === b
}

function ResourceIcon({ selected }: { selected: boolean }) {
  return (
    <div
      className={`mkt-res-dd__icon ${
        selected ? 'mkt-res-dd__icon--accent' : 'mkt-res-dd__icon--muted'
      }`}
      aria-hidden
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z" />
      </svg>
    </div>
  )
}

function ResourceRow({
  item,
  selected,
  onNavigate,
}: {
  item: ResourceLinkItem
  selected: boolean
  onNavigate: () => void
}) {
  return (
    <Link
      className={`mkt-res-dd__row${selected ? ' mkt-res-dd__row--current' : ''}`}
      to={item.to}
      onClick={onNavigate}
      aria-current={selected ? 'page' : undefined}
    >
      <ResourceIcon selected={selected} />
      <div className="mkt-res-dd__text">
        <div className="mkt-res-dd__row-title">{item.title}</div>
        <div className="mkt-res-dd__row-sub">{item.sub}</div>
      </div>
    </Link>
  )
}

export function ResourcesDropdown({ onNavigate }: ResourcesDropdownProps) {
  const id = useId()
  const wrapRef = useRef<HTMLDivElement>(null)
  const { pathname } = useLocation()
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (!open) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  useEffect(() => {
    if (!open) return
    function onPointerDown(e: PointerEvent) {
      const el = wrapRef.current
      if (el && !el.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('pointerdown', onPointerDown, true)
    return () => document.removeEventListener('pointerdown', onPointerDown, true)
  }, [open])

  function close() {
    setOpen(false)
  }

  return (
    <div className="mkt-res-dd" ref={wrapRef}>
      {open && (
        <div
          className="mkt-res-dd__backdrop"
          aria-hidden
          onPointerDown={() => setOpen(false)}
        />
      )}
      <button
        type="button"
        id={`${id}-btn`}
        className={`mkt-nav__res-trigger ${open ? 'mkt-nav__res-trigger--open' : ''}`}
        aria-expanded={open}
        aria-haspopup="true"
        aria-controls={`${id}-menu`}
        onClick={() => setOpen((v) => !v)}
      >
        Resources
        <span className="mkt-nav__res-chevron" aria-hidden>
          ▾
        </span>
      </button>
      {open && (
        <div className="mkt-res-dd__panel" id={`${id}-menu`} role="menu">
          <div className="mkt-res-dd__label">Guides</div>
          {RESOURCE_GUIDES.map((item) => (
            <ResourceRow
              key={item.to}
              item={item}
              selected={pathMatchesCurrent(pathname, item.to)}
              onNavigate={() => {
                close()
                onNavigate()
              }}
            />
          ))}
          <div className="mkt-res-dd__divider" aria-hidden />
          <div className="mkt-res-dd__label">Learn</div>
          {RESOURCE_LEARN.map((item) => (
            <ResourceRow
              key={item.to}
              item={item}
              selected={pathMatchesCurrent(pathname, item.to)}
              onNavigate={() => {
                close()
                onNavigate()
              }}
            />
          ))}
        </div>
      )}
    </div>
  )
}
