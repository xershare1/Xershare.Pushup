import { NavLink, useLocation } from 'react-router-dom'

type TabProps = {
  to: string
  label: string
  end?: boolean
  badge?: number
  icon: 'home' | 'challenge' | 'ranks' | 'videos' | 'profile'
}

function TabIcon({ name }: { name: TabProps['icon'] }) {
  const stroke = 'currentColor'
  const common = { width: 20, height: 20, viewBox: '0 0 24 24', fill: 'none' as const }
  switch (name) {
    case 'home':
      return (
        <svg {...common} aria-hidden>
          <path
            stroke={stroke}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"
          />
          <path stroke={stroke} strokeWidth="2" d="M9 22V12h6v10" />
        </svg>
      )
    case 'challenge':
      return (
        <svg {...common} aria-hidden>
          <path
            stroke={stroke}
            strokeWidth="2"
            strokeLinecap="round"
            d="M4 15s1-2 4-2 5 2 8 2 4-2 4-2M4 9s1-2 4-2 5 2 8 2 4-2 4-2"
          />
        </svg>
      )
    case 'ranks':
      return (
        <svg {...common} aria-hidden>
          <path
            stroke={stroke}
            strokeWidth="2"
            strokeLinecap="round"
            d="M8 21V7l4-3 4 3v14M4 21h16M6 10h.01M18 10h.01"
          />
        </svg>
      )
    case 'videos':
      return (
        <svg {...common} aria-hidden>
          <rect x="2" y="5" width="14" height="14" rx="2" stroke={stroke} strokeWidth="2" />
          <path
            stroke={stroke}
            strokeWidth="2"
            strokeLinejoin="round"
            d="M16 10l6-3v10l-6-3"
          />
        </svg>
      )
    case 'profile':
      return (
        <svg {...common} aria-hidden>
          <circle cx="12" cy="8" r="4" stroke={stroke} strokeWidth="2" />
          <path
            stroke={stroke}
            strokeWidth="2"
            strokeLinecap="round"
            d="M5 21v-1a7 7 0 0114 0v1"
          />
        </svg>
      )
    default:
      return null
  }
}

function Tab({ to, label, end, badge, icon }: TabProps) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        `app-shell__tab ${isActive ? 'app-shell__tab--active' : ''}`
      }
    >
      <span className="app-shell__tab-icon-wrap">
        <TabIcon name={icon} />
        {badge != null && badge > 0 ? (
          <span className="app-shell__tab-badge">{badge > 99 ? '99+' : badge}</span>
        ) : null}
      </span>
      {label}
    </NavLink>
  )
}

function isVideosTabActive(pathname: string) {
  return pathname === '/videos' || pathname === '/solo/videos' || pathname === '/videos/challenges'
}

/** Videos tab opens the hub and stays highlighted on solo/challenge video routes. */
function VideosTab() {
  const { pathname } = useLocation()
  const active = isVideosTabActive(pathname)
  return (
    <NavLink
      to="/videos"
      aria-label="Videos"
      className={() => `app-shell__tab ${active ? 'app-shell__tab--active' : ''}`}
    >
      <span className="app-shell__tab-icon-wrap">
        <TabIcon name="videos" />
      </span>
      Videos
    </NavLink>
  )
}

export function BottomTabBar({ pendingChallengeCount }: { pendingChallengeCount: number }) {
  return (
    <nav className="app-shell__tabbar" aria-label="App">
      <Tab to="/dashboard" end label="Home" icon="home" />
      <Tab to="/my-challenges" label="Challenge" icon="challenge" badge={pendingChallengeCount} />
      <Tab to="/stats" label="Stats" icon="ranks" />
      <VideosTab />
      <Tab to="/credits" label="Profile" icon="profile" />
    </nav>
  )
}
