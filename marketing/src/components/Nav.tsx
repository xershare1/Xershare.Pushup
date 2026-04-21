import { startTransition, useEffect, useState } from 'react'
import { Link, NavLink, useLocation } from 'react-router-dom'

import { APP_OPEN_URL, APP_SIGN_IN_URL } from '../constants'
import { RESOURCE_GUIDES, RESOURCE_LEARN } from '../resources-links'

import { ResourcesDropdown } from './ResourcesDropdown'

export function Nav() {
  const { pathname } = useLocation()
  const resourcesActive = pathname.startsWith('/pushups') || pathname.startsWith('/guides')
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    startTransition(() => {
      setMenuOpen(false)
    })
  }, [pathname])

  const close = () => setMenuOpen(false)

  return (
    <header className="mkt-nav">
      <div className="mkt-nav__bar">
        <Link to="/" className="mkt-nav__logo" onClick={close}>
          <span className="mkt-nav__logo-pushup">Pushup</span>
          <span className="mkt-nav__logo-accent">Pros</span>
        </Link>

        <div className="mkt-nav__desktop">
          <nav className="mkt-nav__center" aria-label="Primary">
            <NavLink
              className={({ isActive }) =>
                `mkt-nav__link ${isActive ? 'mkt-nav__link--active' : ''}`
              }
              to="/how-it-works"
            >
              How it works
            </NavLink>
            <NavLink
              className={({ isActive }) =>
                `mkt-nav__link ${isActive ? 'mkt-nav__link--active' : ''}`
              }
              to="/pricing"
            >
              Pricing
            </NavLink>
            <NavLink
              className={({ isActive }) =>
                `mkt-nav__link ${isActive ? 'mkt-nav__link--active' : ''}`
              }
              to="/about"
            >
              About
            </NavLink>
            <div
              className={`mkt-nav__res-wrap ${resourcesActive ? 'mkt-nav__res-wrap--active' : ''}`}
            >
              <ResourcesDropdown key={pathname} onNavigate={close} />
            </div>
          </nav>

          <div className="mkt-nav__actions mkt-nav__actions--desktop">
            <a className="mkt-nav__login" href={APP_SIGN_IN_URL}>
              Log in
            </a>
            <a className="mkt-nav__open-app" href={APP_OPEN_URL}>
              Open app →
            </a>
          </div>
        </div>

        <button
          type="button"
          className={`mkt-nav__hamburger ${menuOpen ? 'mkt-nav__hamburger--open' : ''}`}
          aria-expanded={menuOpen}
          aria-controls="mkt-nav-mobile"
          aria-label={menuOpen ? 'Close menu' : 'Open menu'}
          onClick={() => setMenuOpen((v) => !v)}
        >
          <span className="mkt-nav__hamburger-bar" />
          <span className="mkt-nav__hamburger-bar" />
          <span className="mkt-nav__hamburger-bar" />
        </button>
      </div>

      <div
        id="mkt-nav-mobile"
        className={`mkt-nav__mobile ${menuOpen ? 'mkt-nav__mobile--open' : ''}`}
        aria-hidden={!menuOpen}
      >
        <nav className="mkt-nav__mobile-primary" aria-label="Mobile primary">
          <Link className="mkt-nav__mobile-row" to="/how-it-works" onClick={close}>
            How it works
            <span className="mkt-nav__mobile-chev" aria-hidden>
              ›
            </span>
          </Link>
          <Link className="mkt-nav__mobile-row" to="/pricing" onClick={close}>
            Pricing
            <span className="mkt-nav__mobile-chev" aria-hidden>
              ›
            </span>
          </Link>
          <Link className="mkt-nav__mobile-row" to="/about" onClick={close}>
            About
            <span className="mkt-nav__mobile-chev" aria-hidden>
              ›
            </span>
          </Link>
        </nav>

        <div className="mkt-nav__mobile-label">Resources — Guides</div>
        <nav className="mkt-nav__mobile-sub" aria-label="Guides">
          {RESOURCE_GUIDES.map((item) => (
            <Link key={item.to} className="mkt-nav__mobile-sublink" to={item.to} onClick={close}>
              <span className="mkt-nav__mobile-dot" aria-hidden />
              {item.title}
            </Link>
          ))}
        </nav>

        <div className="mkt-nav__mobile-label">Resources — Learn</div>
        <nav className="mkt-nav__mobile-sub" aria-label="Learn">
          {RESOURCE_LEARN.map((item) => (
            <Link key={item.to} className="mkt-nav__mobile-sublink" to={item.to} onClick={close}>
              <span className="mkt-nav__mobile-dot" aria-hidden />
              {item.title}
            </Link>
          ))}
        </nav>

        <div className="mkt-nav__mobile-ctas">
          <a className="mkt-nav__mobile-open" href={APP_OPEN_URL} onClick={close}>
            Open app →
          </a>
          <a className="mkt-nav__mobile-login" href={APP_SIGN_IN_URL} onClick={close}>
            Log in
          </a>
        </div>
      </div>
    </header>
  )
}
