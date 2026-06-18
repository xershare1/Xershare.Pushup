import { useCallback, useState, type ReactNode } from 'react'
import { Link, NavLink, useLocation } from 'react-router-dom'
import { BottomSheet } from './BottomSheet'

// ——— Icons ———

function Icon({ children }: { children: ReactNode }) {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      {children}
    </svg>
  )
}

function HomeIcon() {
  return (
    <Icon>
      <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
      <path d="M9 22V12h6v10" />
    </Icon>
  )
}

function CompeteIcon() {
  return (
    <Icon>
      <path d="M8 21h8M12 17v4" />
      <path d="M6 3h12l-1 9a5 5 0 01-10 0L6 3z" />
      <path d="M3 3h3M18 3h3" />
    </Icon>
  )
}

function LibraryIcon() {
  return (
    <Icon>
      <rect x="3" y="3" width="7" height="7" />
      <rect x="14" y="3" width="7" height="7" />
      <rect x="3" y="14" width="7" height="7" />
      <rect x="14" y="14" width="7" height="7" />
    </Icon>
  )
}

function FriendsIcon() {
  return (
    <Icon>
      <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" />
    </Icon>
  )
}

function AccountIcon() {
  return (
    <Icon>
      <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </Icon>
  )
}

function SoloIcon() {
  return (
    <Icon>
      <path d="M7 4h10v3H7V4zm-2 5h14v11a2 2 0 01-2 2H7a2 2 0 01-2-2V9zm4 3v6h2v-6H9zm4 0v6h2v-6h-2z" strokeWidth="1.5" />
    </Icon>
  )
}

function ChallengeIcon() {
  return (
    <Icon>
      <path d="M4 15s1-2 4-2 5 2 8 2 4-2 4-2M4 9s1-2 4-2 5 2 8 2 4-2 4-2" />
    </Icon>
  )
}

function MyChallengesIcon() {
  return (
    <Icon>
      <rect x="3" y="4" width="18" height="3" />
      <rect x="3" y="9" width="18" height="11" />
      <path d="M7 13h10M7 17h6" />
    </Icon>
  )
}

function VideoIcon() {
  return (
    <Icon>
      <rect x="2" y="5" width="14" height="14" rx="2" />
      <path d="M16 10l6-3v10l-6-3" />
    </Icon>
  )
}

function StatsIcon() {
  return (
    <Icon>
      <path d="M18 20V10M12 20V4M6 20v-6" />
    </Icon>
  )
}

// ——— Route-aware active detection ———

function useCompeteActive(pathname: string) {
  return (
    pathname === '/solo' ||
    pathname === '/challenge' ||
    pathname === '/my-challenges' ||
    pathname.startsWith('/challenge/') ||
    pathname.startsWith('/c/')
  )
}

function useLibraryActive(pathname: string) {
  return (
    pathname === '/solo/videos' ||
    pathname === '/videos/challenges' ||
    pathname === '/stats'
  )
}

function useAccountActive(pathname: string) {
  return pathname === '/settings' || pathname === '/credits'
}

// ——— Sheet item ———

function SheetItem({
  to,
  label,
  icon,
  badge,
  onClick,
}: {
  to: string
  label: string
  icon: ReactNode
  badge?: number
  onClick: () => void
}) {
  return (
    <Link to={to} className="app-sheet__item" onClick={onClick}>
      <span className="app-sheet__item-icon">{icon}</span>
      {label}
      {badge != null && badge > 0 ? (
        <span className="app-sheet__item-badge">{badge > 99 ? '99+' : badge}</span>
      ) : null}
    </Link>
  )
}

// ——— Direct tab (NavLink) ———

function DirectTab({
  to,
  end,
  label,
  icon,
  isActive,
}: {
  to: string
  end?: boolean
  label: string
  icon: ReactNode
  isActive?: boolean
}) {
  if (isActive !== undefined) {
    return (
      <NavLink
        to={to}
        end={end}
        className={() => `app-shell__tab ${isActive ? 'app-shell__tab--active' : ''}`}
      >
        <span className="app-shell__tab-icon-wrap">{icon}</span>
        {label}
      </NavLink>
    )
  }
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive: a }) =>
        `app-shell__tab ${a ? 'app-shell__tab--active' : ''}`
      }
    >
      <span className="app-shell__tab-icon-wrap">{icon}</span>
      {label}
    </NavLink>
  )
}

// ——— Sheet trigger tab (button) ———

function SheetTab({
  label,
  icon,
  active,
  onClick,
}: {
  label: string
  icon: ReactNode
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      className={`app-shell__tab ${active ? 'app-shell__tab--active' : ''}`}
      onClick={onClick}
    >
      <span className="app-shell__tab-icon-wrap">{icon}</span>
      {label}
    </button>
  )
}

// ——— Main export ———

type SheetState = 'compete' | 'library' | null

export function BottomTabBar({ pendingChallengeCount }: { pendingChallengeCount: number }) {
  const { pathname } = useLocation()
  const [openSheet, setOpenSheet] = useState<SheetState>(null)

  const competeActive = useCompeteActive(pathname)
  const libraryActive = useLibraryActive(pathname)
  const accountActive = useAccountActive(pathname)

  const closeSheet = useCallback(() => setOpenSheet(null), [])

  const toggleCompete = useCallback(() => {
    setOpenSheet((s) => (s === 'compete' ? null : 'compete'))
  }, [])

  const toggleLibrary = useCallback(() => {
    setOpenSheet((s) => (s === 'library' ? null : 'library'))
  }, [])

  return (
    <>
      <BottomSheet open={openSheet === 'compete'} onClose={closeSheet}>
        <SheetItem to="/solo" label="Start Solo" icon={<SoloIcon />} onClick={closeSheet} />
        <SheetItem to="/challenge" label="Start Challenge" icon={<ChallengeIcon />} onClick={closeSheet} />
        <SheetItem
          to="/my-challenges"
          label="My Challenges"
          icon={<MyChallengesIcon />}
          badge={pendingChallengeCount}
          onClick={closeSheet}
        />
      </BottomSheet>

      <BottomSheet open={openSheet === 'library'} onClose={closeSheet}>
        <SheetItem to="/solo/videos" label="Solo Recordings" icon={<VideoIcon />} onClick={closeSheet} />
        <SheetItem to="/videos/challenges" label="Challenge Recordings" icon={<ChallengeIcon />} onClick={closeSheet} />
        <SheetItem to="/stats" label="My Stats" icon={<StatsIcon />} onClick={closeSheet} />
      </BottomSheet>

      <nav className="app-shell__tabbar" aria-label="App">
        <DirectTab to="/dashboard" end label="Home" icon={<HomeIcon />} />
        <SheetTab
          label="Compete"
          icon={<CompeteIcon />}
          active={competeActive || openSheet === 'compete'}
          onClick={toggleCompete}
        />
        <SheetTab
          label="Library"
          icon={<LibraryIcon />}
          active={libraryActive || openSheet === 'library'}
          onClick={toggleLibrary}
        />
        <DirectTab to="/friends" label="Friends" icon={<FriendsIcon />} />
        <DirectTab
          to="/settings"
          label="Account"
          icon={<AccountIcon />}
          isActive={accountActive}
        />
      </nav>
    </>
  )
}
