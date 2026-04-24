import type { ReactNode } from 'react'
import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'

import { GuideShell } from '../../components/guides/GuideShell'
import { useGuideSeo } from '../../components/guides/useGuideSeo'
import { APP_SIGN_UP_URL } from '../../constants'

import '../../styles/guide-variations.css'

const PAGE_TITLE = 'Pushup Variations — Wide, Diamond, Decline & More | PushupPros'
const META_DESCRIPTION =
  'Compare pushup variations — standard, wide grip, diamond, decline, and explosive — with difficulty, muscle focus, and what counts in PushupPros challenges.'

const TOC_ITEMS: { id: string; label: string }[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'standard', label: 'Standard' },
  { id: 'wide-grip', label: 'Wide grip' },
  { id: 'diamond', label: 'Diamond' },
  { id: 'decline', label: 'Decline' },
  { id: 'explosive', label: 'Explosive' },
  { id: 'comparison', label: 'Comparison' },
]

type Filter =
  | 'all'
  | 'beginner'
  | 'intermediate'
  | 'advanced'
  | 'chest'
  | 'tricep'

const FILTER_PILLS: { id: Filter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'beginner', label: 'Beginner' },
  { id: 'intermediate', label: 'Intermediate' },
  { id: 'advanced', label: 'Advanced' },
  { id: 'chest', label: 'Chest focus' },
  { id: 'tricep', label: 'Tricep focus' },
]

type Difficulty = 'beginner' | 'intermediate' | 'advanced'

type VariationDef = {
  slug: string
  title: string
  difficulty: Difficulty
  /** Space-separated tokens: chest, tricep */
  focusTokens: string
  challengeStandard?: boolean
  stats: { label: string; value: string }[]
  illusCaption: string
  body: ReactNode
}

function IllustrationPlaceholder({ caption }: { caption: string }) {
  return (
    <figure className="gdg-illus" aria-label={caption}>
      <div className="gdg-illus__icon" aria-hidden>
        <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
          <path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3 3.5-4.5 4.5 6H5l3.5-4.5z" />
        </svg>
      </div>
      <figcaption className="gdg-illus__cap">{caption}</figcaption>
    </figure>
  )
}

function difficultyBadgeClass(d: Difficulty) {
  if (d === 'beginner') return 'gdg-var-badge gdg-var-badge--beginner'
  if (d === 'intermediate') return 'gdg-var-badge gdg-var-badge--intermediate'
  return 'gdg-var-badge gdg-var-badge--advanced'
}

function difficultyLabel(d: Difficulty) {
  if (d === 'beginner') return 'Beginner'
  if (d === 'intermediate') return 'Intermediate'
  return 'Advanced'
}

function matchesContentFilter(filter: Filter, v: VariationDef): boolean {
  if (filter === 'all') return true
  if (filter === 'beginner' || filter === 'intermediate' || filter === 'advanced') {
    return v.difficulty === filter
  }
  if (filter === 'chest') return v.focusTokens.includes('chest')
  if (filter === 'tricep') return v.focusTokens.includes('tricep')
  return true
}

const VARIATIONS: VariationDef[] = [
  {
    slug: 'standard',
    title: 'Standard',
    difficulty: 'beginner',
    focusTokens: 'chest tricep',
    challengeStandard: true,
    stats: [
      { label: 'Hand width', value: 'Shoulder-width' },
      { label: 'Challenge', value: 'Counts toward score' },
      { label: 'Best for', value: 'Balanced strength' },
      { label: 'AI note', value: 'Default rep model' },
    ],
    illusCaption: 'Illustration: standard pushup side view',
    body: (
      <>
        <p className="gdg-prose">
          Hands under shoulders (or slightly wider), body in one line from head to heels. This is the{' '}
          <strong>baseline pushup</strong> — and the only variation that counts in PushupPros
          challenges.
        </p>
        <div className="gdg-callout--tip">
          <div className="gdg-callout__icon" aria-hidden />
          <p className="gdg-callout__text">
            <span className="gdg-callout__label">Pro tip: </span>
            Film with your full body in frame and use the same depth and lockout you practice here —
            the AI matches the standard rep definition.
          </p>
        </div>
        <div className="gdg-var-muscles" aria-label="Muscles emphasized">
          <span className="gdg-var-muscle gdg-var-muscle--primary">Chest (primary)</span>
          <span className="gdg-var-muscle gdg-var-muscle--secondary">Triceps</span>
          <span className="gdg-var-muscle gdg-var-muscle--secondary">Front delts</span>
        </div>
      </>
    ),
  },
  {
    slug: 'wide-grip',
    title: 'Wide grip',
    difficulty: 'intermediate',
    focusTokens: 'chest',
    stats: [
      { label: 'Hand width', value: 'Wider than shoulders' },
      { label: 'Challenge', value: 'Does not count' },
      { label: 'Best for', value: 'Chest emphasis' },
      { label: 'Shoulder note', value: 'Avoid excessive flare' },
    ],
    illusCaption: 'Illustration: wide hand placement (top view)',
    body: (
      <>
        <p className="gdg-prose">
          Place your hands <strong>noticeably wider than shoulder width</strong>. You&apos;ll feel
          more stretch in the chest; elbows still track at a safe angle — don&apos;t let them flare to
          90°.
        </p>
        <div className="gdg-callout--warn">
          <div className="gdg-callout__icon" aria-hidden />
          <p className="gdg-callout__text">
            <span className="gdg-callout__label">Challenge note: </span>
            Wide-grip reps are great for training — they are <strong>not</strong> scored in official
            challenges. Use standard form when competing.
          </p>
        </div>
        <div className="gdg-callout--tip">
          <div className="gdg-callout__icon" aria-hidden />
          <p className="gdg-callout__text">
            <span className="gdg-callout__label">Pro tip: </span>
            If your wrists bother you, turn fingers out slightly and keep weight stacked through the
            heel of the hand.
          </p>
        </div>
        <div className="gdg-var-muscles" aria-label="Muscles emphasized">
          <span className="gdg-var-muscle gdg-var-muscle--primary">Chest (primary)</span>
          <span className="gdg-var-muscle gdg-var-muscle--secondary">Front delts</span>
        </div>
      </>
    ),
  },
  {
    slug: 'diamond',
    title: 'Diamond',
    difficulty: 'intermediate',
    focusTokens: 'tricep',
    stats: [
      { label: 'Hand width', value: 'Index fingers touch' },
      { label: 'Challenge', value: 'Does not count' },
      { label: 'Best for', value: 'Triceps & inner chest' },
      { label: 'Mobility', value: 'Wrists need flexion' },
    ],
    illusCaption: 'Illustration: diamond hand position',
    body: (
      <>
        <p className="gdg-prose">
          Form a diamond with thumbs and index fingers under your sternum. Elbows stay{' '}
          <strong>close to the body</strong> — this shifts load to the triceps.
        </p>
        <div className="gdg-callout--tip">
          <div className="gdg-callout__icon" aria-hidden />
          <p className="gdg-callout__text">
            <span className="gdg-callout__label">Pro tip: </span>
            If range feels limited, elevate hands on a low step first; keep the same elbow path.
          </p>
        </div>
        <div className="gdg-var-muscles" aria-label="Muscles emphasized">
          <span className="gdg-var-muscle gdg-var-muscle--primary">Triceps (primary)</span>
          <span className="gdg-var-muscle gdg-var-muscle--secondary">Chest</span>
        </div>
      </>
    ),
  },
  {
    slug: 'decline',
    title: 'Decline',
    difficulty: 'intermediate',
    focusTokens: 'chest',
    stats: [
      { label: 'Setup', value: 'Feet elevated' },
      { label: 'Challenge', value: 'Does not count' },
      { label: 'Best for', value: 'Upper chest emphasis' },
      { label: 'Difficulty', value: 'Harder than flat' },
    ],
    illusCaption: 'Illustration: decline pushup with bench',
    body: (
      <>
        <p className="gdg-prose">
          Elevate your feet on a bench or step. Keep the <strong>rigid plank line</strong> — hips
          shouldn&apos;t pike. More load shifts toward the upper chest and shoulders.
        </p>
        <div className="gdg-callout--warn">
          <div className="gdg-callout__icon" aria-hidden />
          <p className="gdg-callout__text">
            <span className="gdg-callout__label">Safety: </span>
            Use a stable surface; start low. Stop if you feel neck strain or shoulder impingement.
          </p>
        </div>
        <div className="gdg-var-muscles" aria-label="Muscles emphasized">
          <span className="gdg-var-muscle gdg-var-muscle--primary">Upper chest (primary)</span>
          <span className="gdg-var-muscle gdg-var-muscle--secondary">Shoulders</span>
        </div>
      </>
    ),
  },
  {
    slug: 'explosive',
    title: 'Explosive (clap)',
    difficulty: 'advanced',
    focusTokens: 'chest tricep',
    stats: [
      { label: 'Pattern', value: 'Push off floor fast' },
      { label: 'Challenge', value: 'Does not count' },
      { label: 'Best for', value: 'Power & rate of force' },
      { label: 'Risk', value: 'Wrist / fall risk' },
    ],
    illusCaption: 'Illustration: explosive pushup trajectory',
    body: (
      <>
        <p className="gdg-prose">
          Drive hard through the floor to momentarily leave it — optional clap at the top. Land with{' '}
          <strong>soft elbows</strong> to absorb impact; maintain alignment on the next rep.
        </p>
        <div className="gdg-callout--warn">
          <div className="gdg-callout__icon" aria-hidden />
          <p className="gdg-callout__text">
            <span className="gdg-callout__label">Injury warning: </span>
            Explosive variations stress wrists, elbows, and shoulders. Skip them if you have joint
            pain, are fatigued, or train on a hard surface without experience.
          </p>
        </div>
        <div className="gdg-callout--tip">
          <div className="gdg-callout__icon" aria-hidden />
          <p className="gdg-callout__text">
            <span className="gdg-callout__label">Pro tip: </span>
            Master standard depth and lockout first; add height (incline explosive) before claps on
            the floor.
          </p>
        </div>
        <div className="gdg-var-muscles" aria-label="Muscles emphasized">
          <span className="gdg-var-muscle gdg-var-muscle--primary">Full upper body (power)</span>
          <span className="gdg-var-muscle gdg-var-muscle--secondary">Core (stability)</span>
        </div>
      </>
    ),
  },
]

function SidebarCta() {
  return (
    <div className="gdg-cta-card">
      <p className="gdg-cta-card__title">Ready to compete?</p>
      <p className="gdg-cta-card__sub">
        Put your form to the test. Challenge someone and see who scores more.
      </p>
      <a className="gdg-cta-card__btn" href={APP_SIGN_UP_URL}>
        Start a challenge →
      </a>
    </div>
  )
}

function MoreGuidesCard() {
  const links = [
    { to: '/guides/pushup-form', label: 'Pushup form' },
    { to: '/guides/training-tips', label: 'Training tips' },
    { to: '/learn/history', label: 'History of the pushup' },
    { to: '/learn/world-records', label: 'World records' },
  ]
  return (
    <div className="gdg-card">
      <div className="gdg-card__title">More guides</div>
      {links.map((l) => (
        <Link key={l.to} className="gdg-card__link" to={l.to}>
          {l.label} →
        </Link>
      ))}
    </div>
  )
}

function InThisGuideCard({ onNavigate }: { onNavigate: (id: string) => void }) {
  return (
    <div className="gdg-card">
      <div className="gdg-card__title">In this guide</div>
      <div className="gdg-card__toc">
        {TOC_ITEMS.map((item) => (
          <button key={item.id} type="button" onClick={() => onNavigate(item.id)}>
            {item.label}
          </button>
        ))}
      </div>
    </div>
  )
}

export function PushupVariationsGuidePage() {
  const [activeId, setActiveId] = useState<string>(TOC_ITEMS[0].id)
  const [contentFilter, setContentFilter] = useState<Filter>('all')
  const [openSlug, setOpenSlug] = useState<string>('standard')

  const scrollToId = useCallback((id: string) => {
    const el = document.getElementById(id)
    el?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [])

  useGuideSeo({
    title: PAGE_TITLE,
    description: META_DESCRIPTION,
    breadcrumbCurrentName: 'Variations',
    jsonLdScriptId: 'jsonld-breadcrumb-pushup-variations',
  })

  useEffect(() => {
    const ids = TOC_ITEMS.map((t) => t.id)
    const onScroll = () => {
      const offset = 140
      let current = ids[0]
      for (const id of ids) {
        const el = document.getElementById(id)
        if (!el) continue
        const top = el.getBoundingClientRect().top + window.scrollY
        if (top <= window.scrollY + offset) current = id
      }
      setActiveId(current)
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    onScroll()
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const openCard = useCallback((slug: string) => {
    setOpenSlug(slug)
  }, [])

  const sidebar = (
    <>
      <SidebarCta />
      <MoreGuidesCard />
      <InThisGuideCard onNavigate={scrollToId} />
    </>
  )

  return (
    <GuideShell
      breadcrumbCurrent="Variations"
      tocItems={TOC_ITEMS}
      activeTocId={activeId}
      onTocNavigate={scrollToId}
      sidebar={sidebar}
      bottomStrip={
        <section className="gdg-strip" aria-labelledby="gdg-var-strip-title">
          <h2 id="gdg-var-strip-title" className="gdg-strip__title">
            Train every variation — compete with standard.
          </h2>
          <p className="gdg-strip__sub">
            Use filters to focus your session, then switch to standard form when you&apos;re ready to
            record a scored challenge.
          </p>
          <div className="gdg-strip__btns">
            <a className="mkt-btn-lg mkt-btn-lg--primary" href={APP_SIGN_UP_URL}>
              Start a challenge →
            </a>
            <Link className="mkt-btn-lg mkt-btn-lg--ghost" to="/guides/pushup-form">
              Read: Pushup form
            </Link>
          </div>
        </section>
      }
    >
      <section id="overview" className="gdg-section gdg-var-overview">
        <div className="gdg-var-alert" role="status">
          <p className="gdg-var-alert__title">Challenges use standard pushups only</p>
          <p className="gdg-var-alert__text">
            Only <strong>standard</strong> pushups count toward your score in PushupPros challenges.
            Other variations below are for training — they won&apos;t register as challenge reps.
          </p>
        </div>

        <header className="gdg-hero">
          <div className="gdg-hero__tag">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path
                d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"
                fill="currentColor"
              />
            </svg>
            Guide
          </div>
          <h1 className="gdg-hero__title">Pushup variations</h1>
          <p className="gdg-hero__sub">
            Know what changes — and what stays the same — when you widen your grip, tuck your hands,
            raise your feet, or add power.
          </p>
          <div className="gdg-hero__meta">
            <span className="gdg-hero__meta-item">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                <path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z" />
              </svg>
              6 min read
            </span>
            <span className="gdg-hero__meta-item">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
              </svg>
              All levels
            </span>
            <span className="gdg-hero__meta-item">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                <path d="M9 2L7.17 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2h-3.17L15 2H9zm3 15c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5z" />
              </svg>
              AI-compatible
            </span>
          </div>
        </header>

        <div className="gdg-var-filters gdg-var-filters--scroll" aria-label="Filter variations">
          {FILTER_PILLS.map((p) => (
            <button
              key={p.id}
              type="button"
              className={
                contentFilter === p.id
                  ? 'gdg-var-filters__btn gdg-var-filters__btn--active'
                  : 'gdg-var-filters__btn'
              }
              onClick={() => setContentFilter(p.id)}
            >
              {p.label}
            </button>
          ))}
        </div>

        <p className="gdg-var-intro">
          Use the filters to narrow by difficulty or muscle focus. Open a card for setup cues, what
          counts in challenges, and quick stats — then compare everything in the table below.
        </p>
      </section>

      <div className="gdg-var-list">
        {VARIATIONS.map((v) => {
          const hidden = !matchesContentFilter(contentFilter, v)
          const isOpen = openSlug === v.slug
          const cardClass = [
            'gdg-var-card',
            v.challengeStandard ? 'gdg-var-card--standard' : '',
            hidden ? 'gdg-var-card--hidden' : '',
            !isOpen ? 'gdg-var-card--collapsed' : '',
          ]
            .filter(Boolean)
            .join(' ')

          return (
            <section
              key={v.slug}
              id={v.slug}
              className={cardClass}
              data-difficulty={v.difficulty}
              data-focus={v.focusTokens}
              hidden={hidden}
            >
              <button
                type="button"
                className="gdg-var-card__header"
                onClick={() => openCard(v.slug)}
                aria-expanded={isOpen}
              >
                <div className="gdg-var-card__header-main">
                  <h2 className="gdg-var-card__title">{v.title}</h2>
                  {v.challengeStandard ? (
                    <span className="gdg-var-badge gdg-var-badge--challenge">Challenge standard</span>
                  ) : null}
                  <span className={difficultyBadgeClass(v.difficulty)}>{difficultyLabel(v.difficulty)}</span>
                </div>
                <svg
                  className={`gdg-var-card__chev ${isOpen ? 'gdg-var-card__chev--open' : ''}`}
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  aria-hidden
                >
                  <path d="M7 10l5 5 5-5z" />
                </svg>
              </button>
              <div className="gdg-var-card__body">
                <div className="gdg-var-card__body-inner">
                  <IllustrationPlaceholder caption={v.illusCaption} />
                  <div className="gdg-var-stats">
                    {v.stats.map((s) => (
                      <div key={s.label} className="gdg-var-stat">
                        <div className="gdg-var-stat__label">{s.label}</div>
                        <div className="gdg-var-stat__value">{s.value}</div>
                      </div>
                    ))}
                  </div>
                  {v.body}
                </div>
              </div>
            </section>
          )
        })}
      </div>

      <section id="comparison" className="gdg-section gdg-var-compare">
        <p className="gdg-section__kicker">At a glance</p>
        <h2 className="gdg-section__title">Variation comparison</h2>
        <p className="gdg-prose">
          Quick reference for hand setup, difficulty, emphasis, and whether reps count in official
          challenges.
        </p>
        <div className="gdg-var-compare__wrap">
          <table className="gdg-var-table">
            <thead>
              <tr>
                <th scope="col">Variation</th>
                <th scope="col">Difficulty</th>
                <th scope="col">Primary focus</th>
                <th scope="col">Challenge</th>
              </tr>
            </thead>
            <tbody>
              <tr className="gdg-var-table__row--standard">
                <td>Standard</td>
                <td>Beginner</td>
                <td className="gdg-var-table__high">Balanced</td>
                <td className="gdg-var-table__check">✓</td>
              </tr>
              <tr>
                <td>Wide grip</td>
                <td>Intermediate</td>
                <td>Chest</td>
                <td className="gdg-var-table__muted">—</td>
              </tr>
              <tr>
                <td>Diamond</td>
                <td>Intermediate</td>
                <td>Triceps</td>
                <td className="gdg-var-table__muted">—</td>
              </tr>
              <tr>
                <td>Decline</td>
                <td>Intermediate</td>
                <td>Upper chest</td>
                <td className="gdg-var-table__muted">—</td>
              </tr>
              <tr>
                <td>Explosive</td>
                <td>Advanced</td>
                <td>Power</td>
                <td className="gdg-var-table__muted">—</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </GuideShell>
  )
}
