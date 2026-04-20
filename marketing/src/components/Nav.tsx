import { startTransition, useEffect, useState } from 'react'
import { Link, NavLink, useLocation } from 'react-router-dom'
import { PushupsDropdown } from './PushupsDropdown'

export function Nav() {
  const { pathname } = useLocation()
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    startTransition(() => {
      setMenuOpen(false)
    })
  }, [pathname])

  return (
    <header className="header">
      <div className="header-inner">
        <Link to="/" className="logo" onClick={() => setMenuOpen(false)}>
          PushupPros
        </Link>

        <button
          type="button"
          className="nav-toggle"
          aria-expanded={menuOpen}
          aria-controls="primary-nav"
          onClick={() => setMenuOpen((v) => !v)}
        >
          <span className="sr-only">Menu</span>
          <span className="nav-toggle-bar" />
          <span className="nav-toggle-bar" />
          <span className="nav-toggle-bar" />
        </button>

        <nav
          id="primary-nav"
          className={`nav ${menuOpen ? 'nav-open' : ''}`}
          aria-label="Primary"
        >
          <PushupsDropdown />
          <NavLink
            to="/how-it-works"
            className={({ isActive }) =>
              `nav-link ${isActive ? 'nav-link-active' : ''}`
            }
            onClick={() => setMenuOpen(false)}
          >
            How it works
          </NavLink>
        </nav>
      </div>
    </header>
  )
}
