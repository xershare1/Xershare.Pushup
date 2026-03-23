import { useEffect, useId, useRef, useState } from 'react'
import { Link } from 'react-router-dom'

const PUSHUP_LINKS = [
  { to: '/pushups/history', label: 'History' },
  { to: '/pushups/variations', label: 'Variations' },
  { to: '/pushups/form', label: 'Form' },
  { to: '/pushups/training', label: 'Training' },
  { to: '/pushups/records', label: 'Records' },
] as const

export function PushupsDropdown() {
  const id = useId()
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <div className="dropdown" ref={rootRef}>
      <button
        type="button"
        className="dropdown-trigger"
        aria-expanded={open}
        aria-haspopup="true"
        aria-controls={`${id}-menu`}
        id={`${id}-btn`}
        onClick={() => setOpen((v) => !v)}
      >
        Pushups
        <span className="dropdown-chevron" aria-hidden>
          ▾
        </span>
      </button>
      {open && (
        <ul
          className="dropdown-menu"
          id={`${id}-menu`}
          role="menu"
          aria-labelledby={`${id}-btn`}
        >
          {PUSHUP_LINKS.map((item) => (
            <li key={item.to} role="none">
              <Link
                role="menuitem"
                className="dropdown-item"
                to={item.to}
                onClick={() => setOpen(false)}
              >
                {item.label}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
