import { UserButton, useAuth, useUser } from '@clerk/react'
import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { Link, NavLink, useLocation } from 'react-router-dom'

import { fetchCreditBalance } from '../api/billing'
import { fetchMyChallenges } from '../api/challenges'
import { countChallengesNeedingAttention } from '../lib/challengeParticipation'
import { CREDIT_BALANCE_REFRESH_EVENT } from '../lib/creditBalanceRefresh'
import type { Challenge } from '../types/challenge'
import { BottomTabBar } from './BottomTabBar'

function Icon({ children }: { children: ReactNode }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
      {children}
    </svg>
  )
}

function NavItem({
  to,
  end,
  label,
  icon,
  challengeStyleActive,
  badge,
}: {
  to: string
  end?: boolean
  label: string
  icon: ReactNode
  challengeStyleActive?: boolean
  badge?: number
}) {
  const { pathname } = useLocation()
  return (
    <NavLink
      to={to}
      end={end}
      aria-label={label}
      className={({ isActive }) => {
        let active = isActive
        if (challengeStyleActive) {
          active = active || pathname.startsWith('/challenge/') || pathname.startsWith('/c/')
        }
        return `app-shell__nav-link ${active ? 'app-shell__nav-link--active' : ''}`
      }}
    >
      {icon}
      <span className="app-shell__nav-label">{label}</span>
      {badge != null && badge > 0 ? (
        <span className="app-shell__nav-badge">{badge > 99 ? '99+' : badge}</span>
      ) : null}
    </NavLink>
  )
}

function NavSubLink({ to, end, label, icon }: { to: string; end?: boolean; label: string; icon: ReactNode }) {
  return (
    <NavLink
      to={to}
      end={end}
      aria-label={label}
      className={({ isActive }) =>
        `app-shell__nav-link app-shell__nav-sub-link ${isActive ? 'app-shell__nav-link--active' : ''}`
      }
    >
      {icon}
      <span className="app-shell__nav-label">{label}</span>
    </NavLink>
  )
}

/** Sidebar rail + tab: one Videos entry; highlight while in any videos destination. */
function isVideosDestination(pathname: string) {
  return pathname === '/videos' || pathname === '/solo/videos' || pathname === '/videos/challenges'
}

function VideosNavRailLink() {
  const { pathname } = useLocation()
  const active = isVideosDestination(pathname)
  return (
    <NavLink
      to="/videos"
      aria-label="Videos"
      className={() => `app-shell__nav-link ${active ? 'app-shell__nav-link--active' : ''}`}
    >
      <Icon>
        <path
          fill="currentColor"
          d="M4 6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6Zm14 1.5L10 12v4l8-4.5v-4Z"
          opacity="0.9"
        />
      </Icon>
      <span className="app-shell__nav-label">Videos</span>
    </NavLink>
  )
}

export function AppShell({ children }: { children: ReactNode }) {
  const { user } = useUser()
  const { getToken } = useAuth()
  const userId = user?.id

  const [challenges, setChallenges] = useState<Challenge[]>([])
  const [balance, setBalance] = useState<number | null>(null)
  const [creditsUnavailable, setCreditsUnavailable] = useState(false)

  const attentionCount = useMemo(
    () => countChallengesNeedingAttention(challenges, userId),
    [challenges, userId],
  )

  useEffect(() => {
    let cancelled = false
    void (async () => {
      await Promise.resolve()
      if (cancelled) return
      if (!userId) {
        setChallenges([])
        return
      }
      try {
        const list = await fetchMyChallenges(getToken)
        if (!cancelled) setChallenges(list)
      } catch {
        if (!cancelled) setChallenges([])
      }
    })()
    return () => {
      cancelled = true
    }
  }, [userId, getToken])

  useEffect(() => {
    let cancelled = false
    void (async () => {
      await Promise.resolve()
      if (cancelled) return
      if (!userId) {
        setBalance(null)
        setCreditsUnavailable(false)
        return
      }
      setCreditsUnavailable(false)
      try {
        const n = await fetchCreditBalance(getToken)
        if (!cancelled) setBalance(n)
      } catch {
        if (!cancelled) {
          setBalance(null)
          setCreditsUnavailable(true)
        }
      }
    })()
    return () => {
      cancelled = true
    }
  }, [userId, getToken])

  useEffect(() => {
    const onRefresh = () => {
      void (async () => {
        await Promise.resolve()
        if (!userId) return
        try {
          const n = await fetchCreditBalance(getToken)
          setBalance(n)
        } catch {
          setBalance(null)
          setCreditsUnavailable(true)
        }
      })()
    }
    window.addEventListener(CREDIT_BALANCE_REFRESH_EVENT, onRefresh)
    return () => window.removeEventListener(CREDIT_BALANCE_REFRESH_EVENT, onRefresh)
  }, [userId, getToken])

  useEffect(() => {
    const onVis = () => {
      if (document.visibilityState !== 'visible') return
      void (async () => {
        await Promise.resolve()
        try {
          if (!userId) {
            setChallenges([])
          } else {
            const list = await fetchMyChallenges(getToken)
            setChallenges(list)
          }
        } catch {
          setChallenges([])
        }
      })()
      void (async () => {
        await Promise.resolve()
        if (!userId) {
          setBalance(null)
          setCreditsUnavailable(false)
          return
        }
        setCreditsUnavailable(false)
        try {
          const n = await fetchCreditBalance(getToken)
          setBalance(n)
        } catch {
          setBalance(null)
          setCreditsUnavailable(true)
        }
      })()
    }
    document.addEventListener('visibilitychange', onVis)
    return () => document.removeEventListener('visibilitychange', onVis)
  }, [userId, getToken])

  const displayName =
    user?.fullName?.trim() ||
    [user?.firstName, user?.lastName].filter(Boolean).join(' ').trim() ||
    user?.username ||
    user?.primaryEmailAddress?.emailAddress ||
    'You'

  return (
    <div className="app-shell">
      <aside className="app-shell__sidebar" aria-label="App navigation">
        <Link className="app-shell__brand" to="/dashboard">
          <span className="app-shell__brand-mark" aria-hidden>
            PP
          </span>
          <span className="app-shell__brand-text">
            Pushup<span className="app-shell__brand-pros">Pros</span>
          </span>
        </Link>

        <nav className="app-shell__nav">
          <div>
            <div className="app-shell__nav-section-title">Main</div>
            <NavItem
              to="/dashboard"
              end
              label="Dashboard"
              icon={
                <Icon>
                  <path
                    fill="currentColor"
                    d="M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-5v-6H10v6H5a1 1 0 0 1-1-1v-9.5Z"
                    opacity="0.9"
                  />
                </Icon>
              }
            />
            <NavItem
              to="/solo"
              end
              label="Solo"
              icon={
                <Icon>
                  <path
                    fill="currentColor"
                    d="M7 4h10v3H7V4Zm-2 5h14v11a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V9Zm4 3v6h2v-6H9Zm4 0v6h2v-6h-2Z"
                    opacity="0.9"
                  />
                </Icon>
              }
            />
            <NavItem
              to="/challenge/start"
              label="Challenge"
              challengeStyleActive
              icon={
                <Icon>
                  <path
                    fill="currentColor"
                    d="M5 4h14v4H5V4Zm0 6h14v10H5V10Zm3 2v6h2v-6H8Zm4 0v6h2v-6h-2Z"
                    opacity="0.9"
                  />
                </Icon>
              }
            />
            <NavItem
              to="/leaderboard"
              label="Leaderboard"
              icon={
                <Icon>
                  <path
                    fill="currentColor"
                    d="M12 3 4 8v2h2v9h4v-5h4v5h4v-9h2V8l-8-5Zm0 2.2L16.5 8h-9L12 5.2Z"
                    opacity="0.9"
                  />
                </Icon>
              }
            />
          </div>

          <div>
            <div className="app-shell__nav-section-title">My stuff</div>
            <div className="app-shell__nav-videos-rail">
              <VideosNavRailLink />
            </div>
            <div className="app-shell__nav-videos-expanded">
              <div className="app-shell__nav-section-title">Videos</div>
              <NavSubLink
                to="/solo/videos"
                end
                label="Solo"
                icon={
                  <Icon>
                    <path
                      fill="currentColor"
                      d="M7 4h10v3H7V4Zm-2 5h14v11a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V9Zm4 3v6h2v-6H9Zm4 0v6h2v-6h-2Z"
                      opacity="0.9"
                    />
                  </Icon>
                }
              />
              <NavSubLink
                to="/videos/challenges"
                end
                label="Challenge"
                icon={
                  <Icon>
                    <path
                      fill="currentColor"
                      d="M5 4h14v4H5V4Zm0 6h14v10H5V10Zm3 2v6h2v-6H8Zm4 0v6h2v-6h-2Z"
                      opacity="0.9"
                    />
                  </Icon>
                }
              />
            </div>
            <NavItem
              to="/stats"
              label="Stats"
              icon={
                <Icon>
                  <path
                    fill="currentColor"
                    d="M7 3h10v18H7V3Zm2 2v14h6V5H9Zm1 2h4v2h-4V7Zm0 4h4v2h-4v-2Z"
                    opacity="0.9"
                  />
                </Icon>
              }
            />
            <NavItem
              to="/my-challenges"
              label="Challenges"
              badge={attentionCount}
              icon={
                <Icon>
                  <path
                    fill="currentColor"
                    d="M5 5h14v3H5V5Zm0 5h14v9H5v-9Zm2 2v5h10v-5H7Z"
                    opacity="0.9"
                  />
                </Icon>
              }
            />
            <NavItem
              to="/friends"
              label="Friends"
              icon={
                <Icon>
                  <path
                    fill="currentColor"
                    d="M9 11a3 3 0 1 1 0-6 3 3 0 0 1 0 6Zm-5 8v-1a5 5 0 0 1 5-5h1a5 5 0 0 1 4.9 4H15a3 3 0 0 0-3 3v2H4v-3Zm11-8a3 3 0 1 1 0-6 3 3 0 0 1 0 6Zm1 9h-2v-2a3 3 0 0 0-3-3h-.3A5 5 0 0 1 20 18v1Z"
                    opacity="0.9"
                  />
                </Icon>
              }
            />
          </div>

          <div>
            <div className="app-shell__nav-section-title">Account</div>
            <NavItem
              to="/credits"
              label="Credits"
              icon={
                <Icon>
                  <path
                    fill="currentColor"
                    d="M12 2C7 6 4 9.5 4 13a8 8 0 1 0 16 0c0-3.5-3-7-8-11Zm0 16a6 6 0 0 1-2-11.7V7a2 2 0 0 0 4 0v-.3A6 6 0 0 1 12 18Z"
                    opacity="0.9"
                  />
                </Icon>
              }
            />
          </div>
        </nav>

        <div className="app-shell__sidebar-foot">
          <div className="app-shell__user-card">
            <UserButton
              appearance={{
                elements: {
                  userButtonAvatarBox: 'app-shell__user-avatar',
                },
              }}
            />
            <div className="app-shell__user-meta">
              <div className="app-shell__user-name">{displayName}</div>
              <div className="app-shell__user-rank">Global rank · coming soon</div>
            </div>
          </div>
          <Link className="app-shell__credits-pill" to="/credits" title="Credits">
            <span className="app-shell__credits-label">Credits</span>
            {creditsUnavailable ? (
              <strong>—</strong>
            ) : balance === null ? (
              <strong>…</strong>
            ) : (
              <strong>{balance} remaining</strong>
            )}
          </Link>
        </div>
      </aside>

      <div className="app-shell__column">
        <main className="app-shell__main">{children}</main>
        <BottomTabBar pendingChallengeCount={attentionCount} />
      </div>
    </div>
  )
}
