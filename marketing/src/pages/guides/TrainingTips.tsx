import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'

import { GuideShell } from '../../components/guides/GuideShell'
import { useGuideSeo } from '../../components/guides/useGuideSeo'
import { APP_OPEN_URL, APP_SIGN_UP_URL } from '../../constants'

import '../../styles/guide-training-tips.css'

const PAGE_TITLE = 'Pushup Training Tips — Build Your Max Reps | PushupPros'
const META_DESCRIPTION =
  'How to build your pushup count with progression tiers, routine ideas, a sample training week, and rep benchmarks. Includes specific training advice for PushupPros 60-second challenges.'

const TOC_ITEMS: { id: string; label: string }[] = [
  { id: 'where-to-start', label: 'Where to start' },
  { id: 'progression-tiers', label: 'Progression tiers' },
  { id: 'routine-ideas', label: 'Routine ideas' },
  { id: 'sample-week', label: 'Sample week' },
  { id: 'rep-benchmarks', label: 'Rep benchmarks' },
  { id: 'recovery-tips', label: 'Recovery tips' },
  { id: 'compete-faster', label: 'Compete faster' },
]

const WEEK_ROWS: {
  day: string
  focus: string
  detail: string
  pill: 'train' | 'rest' | 'compete'
  rest?: boolean
}[] = [
  { day: 'Mon', focus: 'Strength', detail: '3 sets × max reps (standard)', pill: 'train' },
  { day: 'Tue', focus: 'Rest', detail: 'Recovery — stretch if needed', pill: 'rest', rest: true },
  { day: 'Wed', focus: 'Endurance', detail: 'EMOM × 10 min (5 reps/min)', pill: 'train' },
  { day: 'Thu', focus: 'Rest', detail: 'Recovery', pill: 'rest', rest: true },
  { day: 'Fri', focus: 'Strength', detail: '3 sets × max reps + 1 slow set', pill: 'train' },
  { day: 'Sat', focus: 'Rest', detail: 'Recovery', pill: 'rest', rest: true },
  {
    day: 'Sun',
    focus: 'Challenge',
    detail: 'Record your best set — challenge someone',
    pill: 'compete',
  },
]

const BENCH_ROWS: { label: string; widthPct: string; color: string; value: string }[] = [
  { label: 'Beginner', widthPct: '12%', color: 'rgba(76,175,80,0.4)', value: '1–10 reps' },
  { label: 'Developing', widthPct: '28%', color: 'rgba(76,175,80,0.55)', value: '11–20 reps' },
  { label: 'Average', widthPct: '45%', color: 'rgba(255,193,7,0.6)', value: '21–30 reps' },
  { label: 'Good', widthPct: '62%', color: 'rgba(255,87,34,0.6)', value: '31–44 reps' },
  { label: 'Excellent', widthPct: '80%', color: 'rgba(255,87,34,0.8)', value: '45–59 reps' },
  { label: 'Elite', widthPct: '100%', color: '#ff5722', value: '60+ reps' },
]

function TierIconBeginner() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" />
    </svg>
  )
}

function TierIconIntermediate() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M16 6l2.29 2.29-4.88 4.88-4-4L2 16.59 3.41 18l6-6 4 4 6.3-6.29L22 12V6h-6z" />
    </svg>
  )
}

function TierIconAdvanced() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21 12 17.27z" />
    </svg>
  )
}

function SidebarCta() {
  return (
    <div className="gdg-cta-card">
      <p className="gdg-cta-card__title">Put it to the test</p>
      <p className="gdg-cta-card__sub">
        Record a solo session and see your baseline. Then challenge someone to beat it.
      </p>
      <a className="gdg-cta-card__btn" href={APP_OPEN_URL}>
        Start a solo session →
      </a>
    </div>
  )
}

function MoreGuidesCard() {
  const links = [
    { to: '/guides/pushup-form', label: 'Pushup form' },
    { to: '/guides/pushup-variations', label: 'Variations' },
    { to: '/pushups/history', label: 'History of the pushup' },
    { to: '/pushups/records', label: 'World records' },
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

function QuickBenchmarksCard() {
  return (
    <div className="gdg-tt-quick">
      <div className="gdg-tt-quick__title">Quick benchmarks (male, one set)</div>
      <div className="gdg-tt-quick__row">
        <span className="gdg-tt-quick__label">Beginner</span>
        <span className="gdg-tt-quick__val gdg-tt-quick__val--muted">1–10</span>
      </div>
      <div className="gdg-tt-quick__row">
        <span className="gdg-tt-quick__label">Developing</span>
        <span className="gdg-tt-quick__val gdg-tt-quick__val--muted">11–20</span>
      </div>
      <div className="gdg-tt-quick__row">
        <span className="gdg-tt-quick__label">Average</span>
        <span className="gdg-tt-quick__val gdg-tt-quick__val--muted">21–30</span>
      </div>
      <div className="gdg-tt-quick__row">
        <span className="gdg-tt-quick__label">Good</span>
        <span className="gdg-tt-quick__val gdg-tt-quick__val--amber">31–44</span>
      </div>
      <div className="gdg-tt-quick__row">
        <span className="gdg-tt-quick__label">Excellent</span>
        <span className="gdg-tt-quick__val gdg-tt-quick__val--orange">45–59</span>
      </div>
      <div className="gdg-tt-quick__row">
        <span className="gdg-tt-quick__label">Elite</span>
        <span className="gdg-tt-quick__val gdg-tt-quick__val--orange gdg-tt-quick__val--elite">
          60+
        </span>
      </div>
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

function pillClass(kind: 'train' | 'rest' | 'compete') {
  if (kind === 'train') return 'gdg-tt-week__pill gdg-tt-week__pill--train'
  if (kind === 'rest') return 'gdg-tt-week__pill gdg-tt-week__pill--rest'
  return 'gdg-tt-week__pill gdg-tt-week__pill--compete'
}

function pillLabel(kind: 'train' | 'rest' | 'compete') {
  if (kind === 'train') return 'Train'
  if (kind === 'rest') return 'Rest'
  return 'Compete'
}

export function TrainingTipsGuidePage() {
  const [activeId, setActiveId] = useState<string>(TOC_ITEMS[0].id)

  const scrollToId = useCallback((id: string) => {
    const el = document.getElementById(id)
    el?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [])

  useGuideSeo({
    title: PAGE_TITLE,
    description: META_DESCRIPTION,
    breadcrumbCurrentName: 'Training tips',
    jsonLdScriptId: 'jsonld-breadcrumb-training-tips',
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
      <MoreGuidesCard />
      <QuickBenchmarksCard />
      <InThisGuideCard onNavigate={scrollToId} />
    </>
  )

  return (
    <GuideShell
      breadcrumbCurrent="Training tips"
      tocItems={TOC_ITEMS}
      activeTocId={activeId}
      onTocNavigate={scrollToId}
      sidebar={sidebar}
      bottomStrip={
        <section className="gdg-strip" aria-labelledby="gdg-tt-strip-title">
          <h2 id="gdg-tt-strip-title" className="gdg-strip__title">
            Trained enough. Time to compete.
          </h2>
          <p className="gdg-strip__sub">
            Record your best set and challenge someone to beat it. The 60-second clock is waiting.
          </p>
          <div className="gdg-strip__btns">
            <a className="mkt-btn-lg mkt-btn-lg--primary" href={APP_SIGN_UP_URL}>
              Start a challenge →
            </a>
            <a className="mkt-btn-lg mkt-btn-lg--ghost" href={APP_OPEN_URL}>
              Solo session first
            </a>
          </div>
        </section>
      }
    >
      <header className="gdg-hero">
        <div className="gdg-hero__tag">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
            <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" fill="currentColor" />
          </svg>
          Guide
        </div>
        <h1 className="gdg-hero__title">Training &amp; improvement</h1>
        <p className="gdg-hero__sub">
          How to build your pushup count systematically — whether you&apos;re starting from zero or
          trying to break your personal best before your next challenge.
        </p>
        <div className="gdg-hero__meta">
          <span className="gdg-hero__meta-item">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
              <path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z" />
            </svg>
            7 min read
          </span>
          <span className="gdg-hero__meta-item">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
            </svg>
            All levels
          </span>
          <span className="gdg-hero__meta-item">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
              <path d="M19.44 12.99c-.04-1.55-.2-3.04-.51-4.46l2.02-1.58c.35-.28.45-.78.22-1.18l-2-3.46c-.23-.4-.73-.55-1.15-.37l-2.38.95c-1.11-.84-2.35-1.54-3.69-2.07l-.36-2.54c-.06-.43-.42-.76-.87-.76h-4c-.45 0-.81.33-.87.76l-.36 2.54c-1.34.53-2.58 1.23-3.69 2.07l-2.38-.95c-.42-.18-.92-.03-1.15.37l-2 3.46c-.23.4-.13.9.22 1.18l2.02 1.58c-.31 1.42-.47 2.91-.51 4.46 0 .16.02.31.05.47l-2.02 1.58c-.35.28-.45.78-.22 1.18l2 3.46c.23.4.73.55 1.15.37l2.38-.95c1.11.84 2.35 1.54 3.69 2.07l.36 2.54c.05.43.41.76.86.76h4c.45 0 .81-.33.86-.76l.36-2.54c1.34-.53 2.58-1.23 3.69-2.07l2.38.95c.42.18.92.03 1.15-.37l2-3.46c.23-.4.13-.9-.22-1.18l-2.02-1.58c.03-.16.05-.31.05-.47zM12 15.5c-1.93 0-3.5-1.57-3.5-3.5s1.57-3.5 3.5-3.5 3.5 1.57 3.5 3.5-1.57 3.5-3.5 3.5z" />
            </svg>
            No equipment
          </span>
        </div>
      </header>

      <section id="where-to-start" className="gdg-section">
        <p className="gdg-section__kicker">01 — Where to start</p>
        <h2 className="gdg-section__title">Find your baseline first</h2>
        <p className="gdg-prose">
          Before you train, you need a number. <strong>Do one max-effort set right now</strong> — as
          many clean reps as possible with good form. That number is your baseline. Everything from
          here is about beating it.
        </p>
        <div className="gdg-callout--tip">
          <div className="gdg-callout__icon" aria-hidden />
          <p className="gdg-callout__text">
            <span className="gdg-callout__label">Use the app to baseline: </span>
            Open a solo session, record your max set, and let the AI count for you. Your score is saved
            automatically — so you&apos;ll always know exactly what you&apos;re trying to beat.
          </p>
        </div>
      </section>

      <section id="progression-tiers" className="gdg-section">
        <p className="gdg-section__kicker">02 — Progression tiers</p>
        <h2 className="gdg-section__title">Three stages, one direction</h2>
        <p className="gdg-prose">
          Every level has the right approach. Skip a tier and you&apos;ll plateau — or get hurt. Start
          where your current rep count puts you.
        </p>

        <article className="gdg-tt-tier gdg-tt-tier--beginner">
          <div className="gdg-tt-tier__label">
            <div className="gdg-tt-tier__icon">
              <TierIconBeginner />
            </div>
            <span className="gdg-tt-tier__badge">Beginner</span>
          </div>
          <div className="gdg-tt-tier__body">
            <p className="gdg-tt-tier__title">0–10 reps</p>
            <p className="gdg-tt-tier__desc">
              Start with <strong>incline pushups</strong> (hands on bench or wall) or{' '}
              <strong>knee pushups</strong> — same body line, less weight. Build volume with good form
              before going full floor.
            </p>
            <div className="gdg-tt-tier__pills" aria-label="Example approaches">
              <span className="gdg-tt-tier__pill">Incline pushups</span>
              <span className="gdg-tt-tier__pill">Knee pushups</span>
              <span className="gdg-tt-tier__pill">Wall pushups</span>
            </div>
          </div>
        </article>

        <article className="gdg-tt-tier gdg-tt-tier--intermediate">
          <div className="gdg-tt-tier__label">
            <div className="gdg-tt-tier__icon">
              <TierIconIntermediate />
            </div>
            <span className="gdg-tt-tier__badge">Intermediate</span>
          </div>
          <div className="gdg-tt-tier__body">
            <p className="gdg-tt-tier__title">10–25 reps</p>
            <p className="gdg-tt-tier__desc">
              Standard pushups for multiple sets at a{' '}
              <strong>challenging but repeatable rep count</strong>. Add a slow 3-second descent to
              build strength. Focus on consistency over daily max attempts.
            </p>
            <div className="gdg-tt-tier__pills" aria-label="Example approaches">
              <span className="gdg-tt-tier__pill">3-second descent</span>
              <span className="gdg-tt-tier__pill">Multiple sets</span>
              <span className="gdg-tt-tier__pill">Rest-pause</span>
            </div>
          </div>
        </article>

        <article className="gdg-tt-tier gdg-tt-tier--advanced">
          <div className="gdg-tt-tier__label">
            <div className="gdg-tt-tier__icon">
              <TierIconAdvanced />
            </div>
            <span className="gdg-tt-tier__badge">Advanced</span>
          </div>
          <div className="gdg-tt-tier__body">
            <p className="gdg-tt-tier__title">25+ reps</p>
            <p className="gdg-tt-tier__desc">
              <strong>Weighted pushups, deficit pushups, or harder variations</strong> once standard
              form stays solid under fatigue. Train power with explosive pushups 1–2x per week.
            </p>
            <div className="gdg-tt-tier__pills" aria-label="Example approaches">
              <span className="gdg-tt-tier__pill">Weighted vest</span>
              <span className="gdg-tt-tier__pill">Deficit pushups</span>
              <span className="gdg-tt-tier__pill">Explosive</span>
            </div>
          </div>
        </article>

        <div className="gdg-callout--warn">
          <div className="gdg-callout__icon" aria-hidden />
          <p className="gdg-callout__text">
            <span className="gdg-callout__label">Progress gradually. </span>
            If your form breaks down, reduce reps or use an easier variation. Partial reps with bad
            form don&apos;t count in a challenge — and build bad habits.
          </p>
        </div>
      </section>

      <section id="routine-ideas" className="gdg-section">
        <p className="gdg-section__kicker">03 — Routine ideas</p>
        <h2 className="gdg-section__title">Two methods that work</h2>
        <p className="gdg-prose">
          Both of these methods are simple, effective, and work without any equipment. Pick the one
          that fits your schedule.
        </p>

        <div className="gdg-tt-routines">
          <article className="gdg-tt-routine gdg-tt-routine--featured">
            <h3 className="gdg-tt-routine__name">Starter method</h3>
            <p className="gdg-tt-routine__tag">Best for beginners → intermediate</p>
            <div className="gdg-tt-routine__stats">
              <div className="gdg-tt-routine__stat">
                <div className="gdg-tt-routine__stat-label">Sets</div>
                <div className="gdg-tt-routine__stat-value">3 sets</div>
              </div>
              <div className="gdg-tt-routine__stat">
                <div className="gdg-tt-routine__stat-label">Reps</div>
                <div className="gdg-tt-routine__stat-value">Max good reps</div>
              </div>
              <div className="gdg-tt-routine__stat">
                <div className="gdg-tt-routine__stat-label">Frequency</div>
                <div className="gdg-tt-routine__stat-value">2–3× per week</div>
              </div>
              <div className="gdg-tt-routine__stat">
                <div className="gdg-tt-routine__stat-label">Rest between</div>
                <div className="gdg-tt-routine__stat-value">1–2 days</div>
              </div>
            </div>
            <p className="gdg-tt-routine__desc">
              3 sets of as many clean reps as possible. Rest 2–3 minutes between sets. Do this 2–3
              times a week with rest days between. Simple. Effective. Add 1 rep per set every week.
            </p>
          </article>

          <article className="gdg-tt-routine">
            <h3 className="gdg-tt-routine__name">Density method</h3>
            <p className="gdg-tt-routine__tag">Best for intermediate → advanced</p>
            <div className="gdg-tt-routine__stats">
              <div className="gdg-tt-routine__stat">
                <div className="gdg-tt-routine__stat-label">Format</div>
                <div className="gdg-tt-routine__stat-value">Every minute</div>
              </div>
              <div className="gdg-tt-routine__stat">
                <div className="gdg-tt-routine__stat-label">Example</div>
                <div className="gdg-tt-routine__stat-value">5 reps / min</div>
              </div>
              <div className="gdg-tt-routine__stat">
                <div className="gdg-tt-routine__stat-label">Duration</div>
                <div className="gdg-tt-routine__stat-value">10–15 minutes</div>
              </div>
              <div className="gdg-tt-routine__stat">
                <div className="gdg-tt-routine__stat-label">Adjust</div>
                <div className="gdg-tt-routine__stat-value">By current level</div>
              </div>
            </div>
            <p className="gdg-tt-routine__desc">
              Every minute on the minute (EMOM). Set a rep target per minute you can maintain — e.g. 5
              reps. Rest for the remainder. Builds work capacity and endurance under fatigue.
            </p>
          </article>
        </div>

        <div className="gdg-callout--tip">
          <div className="gdg-callout__icon" aria-hidden />
          <p className="gdg-callout__text">
            <span className="gdg-callout__label">Combine them: </span>
            Use the Starter method for your main training days and the Density method once a week as a
            conditioning session. You&apos;ll build both strength and endurance.
          </p>
        </div>
      </section>

      <section id="sample-week" className="gdg-section">
        <p className="gdg-section__kicker">04 — Sample week</p>
        <h2 className="gdg-section__title">What a training week looks like</h2>
        <p className="gdg-prose">
          This is an intermediate-level week. Adjust volume up or down based on your current rep count.
        </p>

        <div className="gdg-tt-week">
          <div className="gdg-tt-week__head" role="row">
            <span>Day</span>
            <span>Focus</span>
            <span>Detail</span>
            <span>Status</span>
          </div>
          {WEEK_ROWS.map((row) => (
            <div
              key={row.day}
              className={
                row.rest ? 'gdg-tt-week__row gdg-tt-week__row--rest' : 'gdg-tt-week__row'
              }
              role="row"
            >
              <div className="gdg-tt-week__day">{row.day}</div>
              <div className="gdg-tt-week__stack">
                <div className="gdg-tt-week__focus">{row.focus}</div>
                <div className="gdg-tt-week__detail">{row.detail}</div>
              </div>
              <span className={pillClass(row.pill)}>{pillLabel(row.pill)}</span>
            </div>
          ))}
        </div>

        <div className="gdg-callout--tip">
          <div className="gdg-callout__icon" aria-hidden />
          <p className="gdg-callout__text">
            <span className="gdg-callout__label">Sunday is challenge day. </span>
            Scheduling your best set at the end of the week means you&apos;ve had 6 days of training
            and 2 rest days before you record. That&apos;s when you&apos;ll perform your best.
          </p>
        </div>
      </section>

      <section id="rep-benchmarks" className="gdg-section">
        <p className="gdg-section__kicker">05 — Rep benchmarks</p>
        <h2 className="gdg-section__title">Where do you stand?</h2>
        <p className="gdg-prose">
          These are rough benchmarks for adult males doing standard pushups in one set. Women&apos;s
          benchmarks are typically 30–40% lower across categories.
        </p>

        <div className="gdg-tt-bench">
          {BENCH_ROWS.map((row) => (
            <div key={row.label} className="gdg-tt-bench__row">
              <span className="gdg-tt-bench__label">{row.label}</span>
              <div className="gdg-tt-bench__track" aria-hidden>
                <div
                  className="gdg-tt-bench__fill"
                  style={{ width: row.widthPct, background: row.color }}
                />
              </div>
              <span className="gdg-tt-bench__value">{row.value}</span>
            </div>
          ))}
        </div>
      </section>

      <section id="recovery-tips" className="gdg-section">
        <p className="gdg-section__kicker">06 — Recovery tips</p>
        <h2 className="gdg-section__title">The set you skip is part of the training</h2>
        <p className="gdg-prose">
          Most people plateau because they train too often, not too little. Pushups are a compound
          movement — your chest, triceps, and shoulders all need recovery time before they can come back
          stronger.
        </p>
        <div className="gdg-callout--tip">
          <div className="gdg-callout__icon" aria-hidden />
          <p className="gdg-callout__text">
            <span className="gdg-callout__label">48-hour rule: </span>
            Give yourself at least 48 hours between heavy pushup sessions targeting the same muscles.
            Training the same muscle group daily limits your ability to grow stronger.
          </p>
        </div>
        <div className="gdg-callout--tip">
          <div className="gdg-callout__icon" aria-hidden />
          <p className="gdg-callout__text">
            <span className="gdg-callout__label">Sleep matters more than extra sets: </span>
            Muscle repair happens during sleep. 7–9 hours beats an extra training session almost every
            time if you&apos;re already doing 3 sessions a week.
          </p>
        </div>
        <div className="gdg-callout--warn">
          <div className="gdg-callout__icon" aria-hidden />
          <p className="gdg-callout__text">
            <span className="gdg-callout__label">Soreness ≠ progress. </span>
            Delayed onset muscle soreness (DOMS) is normal early in training but fades as your body
            adapts. Don&apos;t chase soreness as a marker of a good session.
          </p>
        </div>
      </section>

      <section id="compete-faster" className="gdg-section">
        <p className="gdg-section__kicker">07 — Compete faster</p>
        <h2 className="gdg-section__title">Training for a 60-second challenge specifically</h2>
        <p className="gdg-prose">
          A PushupPros challenge is a single 60-second max effort. That&apos;s a specific demand —
          and you can train for it specifically.
        </p>
        <div className="gdg-callout--tip">
          <div className="gdg-callout__icon" aria-hidden />
          <p className="gdg-callout__text">
            <span className="gdg-callout__label">Pace practice: </span>
            Set a 60-second timer and practice hitting a target rep count with even pacing. Going too
            fast early burns out your triceps — learn your sustainable pace.
          </p>
        </div>
        <div className="gdg-callout--tip">
          <div className="gdg-callout__icon" aria-hidden />
          <p className="gdg-callout__text">
            <span className="gdg-callout__label">Don&apos;t max before your challenge: </span>
            Avoid heavy training in the 24–48 hours before you plan to record. Fresh muscles produce
            more reps than fatigued ones.
          </p>
        </div>
        <div className="gdg-callout--tip">
          <div className="gdg-callout__icon" aria-hidden />
          <p className="gdg-callout__text">
            <span className="gdg-callout__label">Camera position matters: </span>
            Practice in your challenge setup — same room, same camera angle. The AI readiness check
            needs your full body in frame before it starts counting.
          </p>
        </div>
      </section>
    </GuideShell>
  )
}
