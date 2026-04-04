import type { ReactNode } from 'react'
import { Show, SignInButton, SignUpButton, UserButton } from '@clerk/react'
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
            <Show when="signed-in">
              <NavLink
                to="/purchase"
                className={({ isActive }) =>
                  `nav-link ${isActive ? 'nav-link-active' : ''}`
                }
              >
                Credits
              </NavLink>
            </Show>
          </nav>
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
            <Show when="signed-in">
              <div className="header-auth-user">
                <UserButton
                  appearance={{
                    elements: {
                      userButtonAvatarBox: 'header-user-avatar',
                    },
                  }}
                />
              </div>
            </Show>
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
