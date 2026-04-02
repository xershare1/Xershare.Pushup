import type { ReactNode } from 'react'
import { Link, NavLink } from 'react-router-dom'

type LayoutProps = {
  children: ReactNode
}

export function Layout({ children }: LayoutProps) {
  return (
    <div className="layout">
      <header className="header">
        <div className="header-inner">
          <Link className="logo" to="/">
            PushupPros
          </Link>
          <nav className="nav nav--inline" aria-label="Primary">
            <NavLink
              to="/challenge/start"
              className={({ isActive }) =>
                `nav-link ${isActive ? 'nav-link-active' : ''}`
              }
            >
              New challenge
            </NavLink>
            <NavLink
              to="/leaderboard"
              className={({ isActive }) =>
                `nav-link ${isActive ? 'nav-link-active' : ''}`
              }
            >
              Leaderboard
            </NavLink>
          </nav>
        </div>
      </header>
      <main className="main">{children}</main>
      <footer className="footer">
        <p className="footer-note">PushupPros — social pushup challenges</p>
      </footer>
    </div>
  )
}
