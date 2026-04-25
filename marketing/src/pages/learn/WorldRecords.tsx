import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'

import { GuideShell } from '../../components/guides/GuideShell'
import { useGuideSeo } from '../../components/guides/useGuideSeo'
import { APP_LEADERBOARD_URL, APP_SIGN_UP_URL } from '../../constants'

import '../../styles/guide-world-records.css'

const PAGE_TITLE = 'Pushup World Records — How Do You Compare? | PushupPros'
const META_DESCRIPTION =
  'The verified pushup world records — 46,001 in 24 hours, 140 in 1 minute, and more. See how your score compares and what makes a record count.'

const TOC_ITEMS: { id: string; label: string }[] = [
  { id: 'headline-number', label: 'The headline number' },
  { id: 'records-by-category', label: 'Records by category' },
  { id: 'how-you-compare', label: 'How you compare' },
  { id: 'notable-milestones', label: 'Notable milestones' },
  { id: 'verification-standards', label: 'Verification standards' },
  { id: 'pushuppros-leaderboard', label: 'PushupPros leaderboard' },
]

type TimedRow = {
  cat: string
  country: string
  holder: string
  year: string
  record: string
  wr: boolean
  wrRow: boolean
}

const TIMED: TimedRow[] = [
  { cat: '24 hours (male)', country: 'United States', holder: 'Charles Servizio', year: '1993', record: '46,001', wr: true, wrRow: true },
  { cat: '12 hours (male)', country: 'Canada', holder: 'Doug Pruden', year: '2012', record: '19,325', wr: false, wrRow: false },
  { cat: '1 hour (male)', country: 'Australia', holder: 'Jarrad Young', year: '2021', record: '3,182', wr: false, wrRow: false },
  { cat: '1 minute (male)', country: 'United Kingdom', holder: 'Carlton Williams', year: '2014', record: '140', wr: true, wrRow: true },
  { cat: '1 minute (female)', country: 'Australia', holder: 'Eva Clarke', year: '2014', record: '83', wr: true, wrRow: true },
  { cat: '30 seconds (male)', country: 'USA', holder: 'Various', year: '2022', record: '78', wr: false, wrRow: false },
]

const ENDURANCE: TimedRow[] = [
  { cat: 'Non-stop (male)', country: 'Japan', holder: 'Minoru Yoshida', year: '1980', record: '10,507', wr: true, wrRow: true },
  { cat: 'One arm (non-stop)', country: 'USA', holder: 'Paddy Doyle', year: '1992', record: '8,794', wr: false, wrRow: false },
]

const COMPARE_ROWS: {
  label: string
  labelWr: boolean
  w: string
  fill: string
  val: string
  valColor: string
}[] = [
  { label: 'World record', labelWr: true, w: '100%', fill: '#ff5722', val: '140', valColor: '#ff5722' },
  {
    label: 'Elite athlete',
    labelWr: false,
    w: '64%',
    fill: 'rgba(255,87,34,0.7)',
    val: '90+',
    valColor: 'rgba(255,255,255,0.7)',
  },
  {
    label: 'Excellent',
    labelWr: false,
    w: '46%',
    fill: 'rgba(255,87,34,0.5)',
    val: '60–89',
    valColor: 'rgba(255,255,255,0.6)',
  },
  {
    label: 'Good',
    labelWr: false,
    w: '32%',
    fill: 'rgba(255,193,7,0.6)',
    val: '40–59',
    valColor: 'rgba(255,255,255,0.55)',
  },
  {
    label: 'Average',
    labelWr: false,
    w: '21%',
    fill: 'rgba(76,175,80,0.6)',
    val: '20–39',
    valColor: 'rgba(255,255,255,0.5)',
  },
  {
    label: 'Beginner',
    labelWr: false,
    w: '10%',
    fill: 'rgba(76,175,80,0.4)',
    val: '1–19',
    valColor: 'rgba(255,255,255,0.4)',
  },
]

function StarIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21 12 17.27z" />
    </svg>
  )
}

function TableBlock({ label, rows }: { label: string; rows: TimedRow[] }) {
  return (
    <>
      <p className="gdg-wr-tlabel">{label}</p>
      <div className="gdg-wr-table-wrap">
        <div className="gdg-wr-thead" role="row">
          <div>Category</div>
          <div>Record holder</div>
          <div>Year</div>
          <div>Record</div>
        </div>
        {rows.map((r) => (
          <div
            key={`${r.cat}-${r.holder}`}
            className={r.wrRow ? 'gdg-wr-tr gdg-wr-tr--wr' : 'gdg-wr-tr'}
            role="row"
          >
            <div className="gdg-wr-cat gdg-wr-td--cat">
              <div className="gdg-wr-cat__line1">
                {r.cat}
                {r.wr ? <span className="gdg-wr-wr">WR</span> : null}
              </div>
              <div className="gdg-wr-cat__line2">{r.country}</div>
            </div>
            <div className="gdg-wr-td--holder">{r.holder}</div>
            <div className="gdg-wr-td--year">{r.year}</div>
            <div className="gdg-wr-td--rec">{r.record}</div>
          </div>
        ))}
      </div>
    </>
  )
}

function SidebarCta() {
  return (
    <div className="gdg-cta-card">
      <p className="gdg-cta-card__title">Set your own record</p>
      <p className="gdg-cta-card__sub">
        AI-verified. Video-backed. Challenge someone to beat it.
      </p>
      <a className="gdg-cta-card__btn" href={APP_SIGN_UP_URL}>
        Start a challenge →
      </a>
    </div>
  )
}

function KeyRecordsCard() {
  const rows: { k: string; v: string; accent?: boolean }[] = [
    { k: '24-hour record', v: '46,001', accent: true },
    { k: '1-hour record', v: '3,182' },
    { k: '1-min record (M)', v: '140', accent: true },
    { k: '1-min record (F)', v: '83', accent: true },
    { k: 'Non-stop record', v: '10,507' },
  ]
  return (
    <div className="gdg-wr-sb-kv">
      <div className="gdg-wr-sb-kv__title">Key records</div>
      {rows.map((r) => (
        <div key={r.k} className="gdg-wr-sb-kv__row">
          <span className="gdg-wr-sb-kv__k">{r.k}</span>
          <span
            className={
              r.accent ? 'gdg-wr-sb-kv__v gdg-wr-sb-kv__v--accent' : 'gdg-wr-sb-kv__v'
            }
          >
            {r.v}
          </span>
        </div>
      ))}
    </div>
  )
}

function MoreGuidesCard() {
  const links = [
    { to: '/learn/history', label: 'History of the pushup' },
    { to: '/guides/pushup-form', label: 'Pushup form' },
    { to: '/guides/pushup-variations', label: 'Variations' },
    { to: '/guides/training-tips', label: 'Training tips' },
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

export function WorldRecordsPage() {
  const [activeId, setActiveId] = useState<string>(TOC_ITEMS[0].id)

  const scrollToId = useCallback((id: string) => {
    const el = document.getElementById(id)
    el?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [])

  const itemListLd = useMemo(() => {
    const all = [...TIMED, ...ENDURANCE]
    return {
      '@context': 'https://schema.org',
      '@type': 'ItemList',
      name: 'Notable verified pushup world records',
      itemListElement: all.map((r, i) => ({
        '@type': 'ListItem',
        position: i + 1,
        name: `${r.cat} — ${r.record} pushups`,
        description: `${r.holder}, ${r.year}`,
      })),
    }
  }, [])

  const additionalJsonLd = useMemo(
    () => [{ id: 'jsonld-itemlist-world-records', data: itemListLd }],
    [itemListLd],
  )

  useGuideSeo({
    title: PAGE_TITLE,
    description: META_DESCRIPTION,
    breadcrumbCurrentName: 'World records',
    jsonLdScriptId: 'jsonld-breadcrumb-world-records',
    middleSegment: { name: 'Learn', itemPath: '/learn' },
    additionalJsonLd,
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

  const sidebar = (
    <>
      <SidebarCta />
      <KeyRecordsCard />
      <MoreGuidesCard />
      <InThisGuideCard onNavigate={scrollToId} />
    </>
  )

  return (
    <GuideShell
      breadcrumbCurrent="World records"
      breadcrumbMid={{ label: 'Learn', to: '/learn' }}
      mobileBack={{ label: 'Learn', to: '/learn' }}
      tocItems={TOC_ITEMS}
      activeTocId={activeId}
      onTocNavigate={scrollToId}
      sidebar={sidebar}
      bottomStrip={
        <section className="gdg-strip" aria-labelledby="gdg-wr-strip-title">
          <h2 id="gdg-wr-strip-title" className="gdg-strip__title">
            The record is 140 in 60 seconds. What&apos;s yours?
          </h2>
          <p className="gdg-strip__sub">
            AI-counted. Video-verified. The same standard as the world record — in your living room.
          </p>
          <div className="gdg-strip__btns">
            <a className="mkt-btn-lg mkt-btn-lg--primary" href={APP_SIGN_UP_URL}>
              Start a challenge →
            </a>
            <Link className="mkt-btn-lg mkt-btn-lg--ghost" to="/learn/history">
              Read: History of pushups
            </Link>
          </div>
        </section>
      }
    >
      <header className="gdg-hero">
        <div className="gdg-hero__tag">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
            <path d="M4 6h16v2H4V6zm0 5h16v2H4v-2zm0 5h10v2H4v-2z" fill="currentColor" />
          </svg>
          Learn
        </div>
        <h1 className="gdg-hero__title">World records</h1>
        <p className="gdg-hero__sub">
          The numbers that define the absolute ceiling of human pushup performance. Inspiring, humbling,
          and — for a 60-second challenge — surprisingly relevant.
        </p>
        <div className="gdg-hero__meta">
          <span className="gdg-hero__meta-item">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
              <path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z" />
            </svg>
            5 min read
          </span>
          <span className="gdg-hero__meta-item">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
              <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" />
            </svg>
            Verified records
          </span>
          <span className="gdg-hero__meta-item">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
              <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z" />
            </svg>
            Guinness World Records source
          </span>
        </div>
      </header>

      <section id="headline-number" className="gdg-section">
        <h2 className="gdg-section__title">46,001 pushups in 24 hours</h2>
        <div className="gdg-wr-hero-card">
          <div className="gdg-wr-hero-card__icon" aria-hidden>
            <StarIcon />
          </div>
          <div className="gdg-wr-hero-card__body">
            <p className="gdg-wr-hero-card__tag">Guinness World Record · Most pushups in 24 hours</p>
            <p className="gdg-wr-hero-card__name">Charles Servizio — United States</p>
            <p className="gdg-wr-hero-card__meta">Set on April 24–25, 1993 · Fontana, California</p>
          </div>
          <div className="gdg-wr-hero-card__right">
            <div className="gdg-wr-hero-card__val">46,001</div>
            <p className="gdg-wr-hero-card__unit">pushups</p>
          </div>
        </div>
        <p className="gdg-prose">
          That&apos;s an average of{' '}
          <strong>32 pushups per minute for 24 consecutive hours.</strong> No sleep. No extended rest.
          Just controlled, verified repetitions for an entire day and night. The record has stood for
          over 30 years.
        </p>
        <div className="gdg-callout--tip">
          <div className="gdg-callout__icon" aria-hidden />
          <p className="gdg-callout__text">
            <span className="gdg-callout__label">To put it in perspective: </span>
            A PushupPros challenge lasts 60 seconds. Servizio&apos;s record pace over that same minute
            would be 32 reps. An excellent PushupPros score is 45+. Different events, different demands
            — but the gap is smaller than you think.
          </p>
        </div>
      </section>

      <section id="records-by-category" className="gdg-section">
        <h2 className="gdg-section__title">Every time window, every category</h2>
        <p className="gdg-prose">
          World records are set across different time windows, age groups, and conditions. These are
          the most cited verified records as of 2024.
        </p>
        <TableBlock label="Most pushups in a set period" rows={TIMED} />
        <TableBlock label="Most in a single set, no time limit" rows={ENDURANCE} />
        <div className="gdg-callout--warn">
          <div className="gdg-callout__icon" aria-hidden />
          <p className="gdg-callout__text">
            <span className="gdg-callout__label">Verification note: </span>
            World record standards and verification methods vary by organization and era. Records
            listed here are sourced from Guinness World Records publications but may be subject to
            updates. Treat as inspirational benchmarks, not authoritative reference data.
          </p>
        </div>
      </section>

      <section id="how-you-compare" className="gdg-section">
        <h2 className="gdg-section__title">Where does your 60-second score fit?</h2>
        <p className="gdg-prose">
          PushupPros challenges are exactly 60 seconds. The world record for a 1-minute set is 140
          reps. Here&apos;s how different performance levels compare to that ceiling — and to each
          other.
        </p>
        <div className="gdg-wr-compare">
          <div className="gdg-wr-compare__title">1-minute pushup scale — where scores fall</div>
          {COMPARE_ROWS.map((row) => (
            <div key={row.label} className="gdg-wr-compare__row">
              <div
                className={
                  row.labelWr
                    ? 'gdg-wr-compare__label gdg-wr-compare__label--wr'
                    : 'gdg-wr-compare__label'
                }
              >
                {row.label}
              </div>
              <div className="gdg-wr-compare__track" aria-hidden>
                <div className="gdg-wr-compare__fill" style={{ width: row.w, background: row.fill }} />
              </div>
              <div className="gdg-wr-compare__val" style={{ color: row.valColor }}>
                {row.val}
              </div>
            </div>
          ))}
        </div>
        <p className="gdg-wr-compare__disc">
          Scale based on general population data. Individual results vary by age, body weight, and
          training history. World record requires specialized training and official verification
          conditions.
        </p>
        <div className="gdg-callout--tip">
          <div className="gdg-callout__icon" aria-hidden />
          <p className="gdg-callout__text">
            <span className="gdg-callout__label">The real competition is your last score. </span>
            World records are aspirational benchmarks — but on PushupPros, the most meaningful number
            is the one you need to beat to win your current challenge. Focus there first.
          </p>
        </div>
      </section>

      <section id="notable-milestones" className="gdg-section">
        <h2 className="gdg-section__title">Numbers worth knowing</h2>
        <div className="gdg-wr-ms">
          <article className="gdg-wr-ms__card">
            <div className="gdg-wr-ms__num">10,000</div>
            <h3 className="gdg-wr-ms__title">The psychological barrier</h3>
            <p className="gdg-wr-ms__body">
              Widely considered the first major endurance milestone — 10k pushups in a day was chased
              by competitive fitness athletes for decades before Yoshida&apos;s 10,507 non-stop
              record.
            </p>
          </article>
          <article className="gdg-wr-ms__card">
            <div className="gdg-wr-ms__num">100</div>
            <h3 className="gdg-wr-ms__title">The 1-minute century</h3>
            <p className="gdg-wr-ms__body">
              100 pushups in 60 seconds is considered elite-level performance. It requires averaging
              1.67 reps per second with zero rest — a pace very few people can maintain for a full
              minute.
            </p>
          </article>
          <article className="gdg-wr-ms__card">
            <div className="gdg-wr-ms__num">1,000</div>
            <h3 className="gdg-wr-ms__title">The daily challenge</h3>
            <p className="gdg-wr-ms__body">
              1,000 pushups per day is a goal many serious athletes pursue as a training benchmark. At
              3 seconds per rep, that&apos;s nearly 50 minutes of continuous pushing — done in sets
              throughout the day.
            </p>
          </article>
        </div>
      </section>

      <section id="verification-standards" className="gdg-section">
        <h2 className="gdg-section__title">What makes a record count?</h2>
        <p className="gdg-prose">
          Official world records require strict verification: independent witnesses, video
          documentation, standardized form criteria, and in many cases, official Guinness
          adjudicators present in person. A rep that doesn&apos;t meet the depth and lockout standard
          is not counted — even at world record pace.
        </p>
        <div className="gdg-callout--tip">
          <div className="gdg-callout__icon" aria-hidden />
          <p className="gdg-callout__text">
            <span className="gdg-callout__label">PushupPros uses the same rep standard. </span>
            Elbows to ~90° on the way down, full lockout at the top. The AI applies this consistently
            to every rep, every session — the same criteria used in official record attempts, applied
            automatically.
          </p>
        </div>
        <div className="gdg-callout--warn">
          <div className="gdg-callout__icon" aria-hidden />
          <p className="gdg-callout__text">
            <span className="gdg-callout__label">Unverified claims are common. </span>
            Social media is full of pushup counts with no verification. A count you do yourself, without
            a standardized rep definition, is not comparable to a verified record. That&apos;s what
            makes the PushupPros AI count meaningful — it applies the same standard every time.
          </p>
        </div>
      </section>

      <section id="pushuppros-leaderboard" className="gdg-section">
        <h2 className="gdg-section__title">The competitive record that matters most right now</h2>
        <p className="gdg-prose">
          World records set the ceiling. PushupPros sets the real competition —{' '}
          <strong>verified, AI-counted, video-backed results</strong> from people just like you. The
          top performers on PushupPros are building a leaderboard that will grow into its own
          competitive record.
        </p>
        <div className="gdg-wr-lb">
          <h3 className="gdg-wr-lb__title">In-app leaderboard</h3>
          <p className="gdg-wr-lb__body">
            The live global leaderboard is available inside the app — showing top performers ranked
            by verified rep counts. Create an account to see where you rank.
          </p>
          <a className="gdg-wr-lb__btn" href={APP_LEADERBOARD_URL}>
            View leaderboard
          </a>
        </div>
      </section>
    </GuideShell>
  )
}
