import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'

type LayoutProps = {
  children: ReactNode
}

export function Layout({ children }: LayoutProps) {
  return (
    <div className="shell">
      <header className="topbar">
        <Link className="brand" to="/">
          PushupPros
        </Link>
        <nav className="nav-links" aria-label="Main">
          <Link to="/challenge/create">New challenge</Link>
          <Link to="/leaderboard">Leaderboard</Link>
        </nav>
      </header>
      <main className="main">{children}</main>
    </div>
  )
}
