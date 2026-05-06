import type { ReactNode } from 'react'
import { startTransition, useEffect, useState } from 'react'
import { Show, SignInButton, SignUpButton } from '@clerk/react'
import { Link, NavLink, useLocation } from 'react-router-dom'

export function PublicChrome({ children }: { children: ReactNode }) {
  const { pathname } = useLocation()
  const [menuOpen, setMenuOpen] = useState(false)

  const challengeNavActive =
    pathname.startsWith('/challenge/') || pathname.startsWith('/c/')

  useEffect(() => {
    startTransition(() => {
      setMenuOpen(false)
    })
  }, [pathname])

  const closeNav = () => setMenuOpen(false)

  return (
    <div className="layout">
      <header className="header">
        <div className="header-inner header-inner--app">
          <Link className="logo header-brand" to="/" onClick={closeNav}>
            PushupPros
          </Link>

          <nav
            id="primary-nav"
            className={`nav header-primary-nav ${menuOpen ? 'nav-open' : ''}`}
            aria-label="Primary"
          >
            <NavLink
              to="/solo"
              end
              className={({ isActive }) =>
                `nav-link ${isActive ? 'nav-link-active' : ''}`
              }
              onClick={closeNav}
            >
              Solo
            </NavLink>
            <NavLink
              to="/challenge"
              className={({ isActive }) =>
                `nav-link ${isActive || challengeNavActive ? 'nav-link-active' : ''}`
              }
              onClick={closeNav}
            >
              Challenge
            </NavLink>
            <NavLink
              to="/stats"
              end
              className={({ isActive }) =>
                `nav-link ${isActive ? 'nav-link-active' : ''}`
              }
              onClick={closeNav}
            >
              Stats
            </NavLink>
          </nav>

          <div className="header-controls">
            <div className="header-auth" aria-label="Account">
              <Show when="signed-out">
                <>
                  <SignInButton mode="modal">
                    <button type="button" className="btn btn-ghost btn--header">
                      Sign in
                    </button>
                  </SignInButton>
                  <SignUpButton mode="modal">
                    <button type="button" className="btn btn-primary btn--header">
                      Sign up
                    </button>
                  </SignUpButton>
                </>
              </Show>
            </div>

            <button
              type="button"
              className="nav-toggle"
              aria-expanded={menuOpen}
              aria-controls="primary-nav"
              onClick={() => setMenuOpen((v) => !v)}
            >
              <span className="sr-only">Menu</span>
              <span className="nav-toggle-bar" aria-hidden />
              <span className="nav-toggle-bar" aria-hidden />
              <span className="nav-toggle-bar" aria-hidden />
            </button>
          </div>
        </div>
      </header>
      <main className="main">{children}</main>
      <footer className="footer">
        <p className="footer-note">PushupPros — social pushup challenges</p>
      </footer>
    </div>
  )
}
