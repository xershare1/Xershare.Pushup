import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth, useUser } from '@clerk/react'
import { fetchMyChallenges } from '../api/challenges'
import type { Challenge } from '../types/challenge'
import { formatError } from '../lib/formatError'
import {
  buildMyChallengeCards,
  filterMyChallengeCards,
  formatLiveMeta,
  groupCardsBySection,
  type MyChallengeCardModel,
  type MyChallengeFilter,
  sortMyChallengeCards,
} from '../lib/myChallengesViewModel'

function LiveMetaLine({ challenge }: { challenge: Challenge }) {
  const [, setTick] = useState(0)
  useEffect(() => {
    const id = window.setInterval(() => setTick((x) => x + 1), 1000)
    return () => window.clearInterval(id)
  }, [])
  return <>{formatLiveMeta(challenge)}</>
}

const FILTERS: { id: MyChallengeFilter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'active', label: 'Active' },
  { id: 'pending', label: 'Pending' },
  { id: 'completed', label: 'Completed' },
]

function avatarClass(kind: MyChallengeCardModel['kind']): string {
  if (kind === 'live') return 'my-challenges-page__avatar my-challenges-page__avatar--live'
  if (kind === 'respond') return 'my-challenges-page__avatar my-challenges-page__avatar--respond'
  if (kind === 'video_pending' || kind === 'challenger_wait')
    return 'my-challenges-page__avatar my-challenges-page__avatar--pending'
  if (kind === 'won') return 'my-challenges-page__avatar my-challenges-page__avatar--won'
  if (kind === 'lost') return 'my-challenges-page__avatar my-challenges-page__avatar--lost'
  return 'my-challenges-page__avatar my-challenges-page__avatar--neutral'
}

function pillClass(pill: MyChallengeCardModel['statusPill']): string {
  const base = 'my-challenges-page__pill'
  if (pill === 'Live') return `${base} my-challenges-page__pill--live`
  if (pill === 'Respond') return `${base} my-challenges-page__pill--respond`
  if (pill === 'Pending') return `${base} my-challenges-page__pill--pending`
  if (pill === 'Won') return `${base} my-challenges-page__pill--won`
  if (pill === 'Lost') return `${base} my-challenges-page__pill--lost`
  if (pill === 'Tie') return `${base} my-challenges-page__pill--tie`
  return `${base} my-challenges-page__pill--muted`
}

function ChallengeCard({ card }: { card: MyChallengeCardModel }) {
  const ch = card.challenge
  const live = card.kind === 'live'
  const showScores = card.kind !== 'respond'
  const your = card.yourScore
  const their = card.theirScore
  const tie = your !== null && their !== null && your === their
  const youAhead = your !== null && their !== null && your > their
  const themAhead = your !== null && their !== null && their > your

  return (
    <Link
      to={`/c/${ch.id}`}
      className={`my-challenges-page__card${live ? ' my-challenges-page__card--live' : ''}`}
    >
      <div className={avatarClass(card.kind)} aria-hidden>
        {card.opponentInitials}
      </div>
      <div className="my-challenges-page__card-body">
        <div className="my-challenges-page__card-title-row">
          <div className="my-challenges-page__card-name-wrap">
            <span className="my-challenges-page__card-name">{card.opponentDisplayName}</span>
            {ch.gifted && (ch.status ?? '').toLowerCase() === 'proposed' && card.kind === 'respond' ? (
              <span className="my-challenges-page__entry-covered">Entry covered</span>
            ) : null}
          </div>
          <span className="my-challenges-page__card-role">{card.roleTag}</span>
        </div>
        <p className="my-challenges-page__card-meta">
          {live ? (
            <>
              <span className="my-challenges-page__live-dot" aria-hidden />
              <LiveMetaLine challenge={ch} />
            </>
          ) : (
            card.meta
          )}
        </p>
      </div>
      {showScores ? (
        <div className="my-challenges-page__scores" aria-hidden>
          <div className="my-challenges-page__score-col">
            <span
              className={`my-challenges-page__score-num${tie ? ' my-challenges-page__score-num--tie' : ''}${!tie && youAhead ? ' my-challenges-page__score-num--win' : ''}${!tie && themAhead ? ' my-challenges-page__score-num--lose' : ''}`}
            >
              {your !== null ? your : '—'}
            </span>
            <span className="my-challenges-page__score-label">you</span>
          </div>
          <span className="my-challenges-page__score-vs">vs</span>
          <div className="my-challenges-page__score-col">
            <span
              className={`my-challenges-page__score-num${tie ? ' my-challenges-page__score-num--tie' : ''}${!tie && themAhead ? ' my-challenges-page__score-num--win' : ''}${!tie && youAhead ? ' my-challenges-page__score-num--lose' : ''}`}
            >
              {their !== null ? their : '—'}
            </span>
            <span className="my-challenges-page__score-label">them</span>
          </div>
        </div>
      ) : (
        <div className="my-challenges-page__scores my-challenges-page__scores--empty" />
      )}
      <span className={pillClass(card.statusPill)}>{card.statusPill}</span>
      <span className="my-challenges-page__chev" aria-hidden>
        ›
      </span>
    </Link>
  )
}

function Section({
  title,
  cards,
}: {
  title: string
  cards: MyChallengeCardModel[]
}) {
  if (cards.length === 0) return null
  return (
    <section className="my-challenges-page__section">
      <h2 className="my-challenges-page__section-label">{title}</h2>
      <div className="my-challenges-page__card-list">
        {cards.map((card) => (
          <ChallengeCard key={card.challenge.id} card={card} />
        ))}
      </div>
    </section>
  )
}

export function MyChallenges() {
  const { user } = useUser()
  const { getToken } = useAuth()
  const userId = user?.id

  const [rows, setRows] = useState<Challenge[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState<MyChallengeFilter>('all')

  async function reload() {
    setError(null)
    try {
      const list = await fetchMyChallenges(getToken)
      setRows(list)
    } catch (e) {
      setError(formatError(e))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void reload()
    // eslint-disable-next-line react-hooks/exhaustive-deps -- getToken identity stable enough
  }, [])

  const cards = useMemo(() => {
    const built = buildMyChallengeCards(rows, userId)
    const sorted = sortMyChallengeCards(built)
    return filterMyChallengeCards(sorted, filter)
  }, [rows, userId, filter])

  const grouped = useMemo(() => groupCardsBySection(cards), [cards])

  if (loading) {
    return (
      <section className="my-challenges-page">
        <p className="my-challenges-page__loading">Loading your challenges…</p>
      </section>
    )
  }

  const hasAny = cards.length > 0

  return (
    <section className="my-challenges-page">
      <header className="my-challenges-page__header">
        <div>
          <h1 className="my-challenges-page__title">My challenges</h1>
          <p className="my-challenges-page__subtitle">
            Invites to answer, battles in progress, and past results
          </p>
        </div>
        <Link to="/challenge/create" className="my-challenges-page__btn-new">
          + New challenge
        </Link>
      </header>

      <div className="my-challenges-page__filters" role="tablist" aria-label="Filter challenges">
        {FILTERS.map((f) => (
          <button
            key={f.id}
            type="button"
            role="tab"
            aria-selected={filter === f.id}
            className={`my-challenges-page__filter${filter === f.id ? ' my-challenges-page__filter--active' : ''}`}
            onClick={() => setFilter(f.id)}
          >
            {f.label}
          </button>
        ))}
      </div>

      {error ? (
        <p className="my-challenges-page__banner my-challenges-page__banner--error" role="alert">
          {error}
        </p>
      ) : null}

      {!hasAny && rows.length === 0 ? (
        <p className="my-challenges-page__empty">No challenges yet. Start one with New challenge.</p>
      ) : null}

      {!hasAny && rows.length > 0 ? (
        <p className="my-challenges-page__empty">No challenges match this filter.</p>
      ) : null}

      {hasAny ? (
        <>
          <Section title="Needs your attention" cards={grouped.attention} />
          <Section title="In progress" cards={grouped.in_progress} />
          <Section title="Completed" cards={grouped.completed} />
        </>
      ) : null}

      <Link to="/challenge/create" className="my-challenges-page__cta-dashed">
        <span className="my-challenges-page__cta-plus" aria-hidden>
          +
        </span>
        <span>Start a new challenge</span>
      </Link>
    </section>
  )
}
