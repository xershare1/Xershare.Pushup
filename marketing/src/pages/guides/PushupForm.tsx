import type { ReactNode } from 'react'
import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'

import { GuideShell } from '../../components/guides/GuideShell'
import { useGuideSeo } from '../../components/guides/useGuideSeo'
import { APP_OPEN_URL, APP_SIGN_UP_URL } from '../../constants'

import '../../styles/guide-pushup-form.css'

const PAGE_TITLE = 'Proper Pushup Form — Guide | PushupPros'
const META_DESCRIPTION =
  'Learn proper pushup form — body alignment, hand placement, elbow angle, and common mistakes. Includes the exact rep standard used by PushupPros AI counting.'

const TOC_ITEMS: { id: string; label: string }[] = [
  { id: 'quick-reference', label: 'Quick reference' },
  { id: 'body-alignment', label: 'Body alignment' },
  { id: 'hand-position', label: 'Hand position' },
  { id: 'depth', label: 'Depth' },
  { id: 'elbow-angle', label: 'Elbow angle' },
  { id: 'common-mistakes', label: 'Common mistakes' },
  { id: 'pre-set-checklist', label: 'Pre-set checklist' },
]

const MISTAKES: { title: string; fix: ReactNode }[] = [
  {
    title: 'Sagging hips',
    fix: (
      <>
        <strong>Fix: brace your core harder and squeeze your glutes</strong> from the moment you set
        up.
      </>
    ),
  },
  {
    title: 'Piking hips',
    fix: (
      <>
        Often a sign of weak core or shoulders.{' '}
        <strong>Fix: think &quot;plank&quot; throughout the entire set.</strong>
      </>
    ),
  },
  {
    title: 'Partial range of motion',
    fix: (
      <>
        Only going halfway down — these don&apos;t count in a challenge.{' '}
        <strong>Fix: slow down your descent and feel the stretch in your chest.</strong>
      </>
    ),
  },
  {
    title: 'Craning the neck',
    fix: (
      <>
        Looking forward or upward strains the cervical spine.{' '}
        <strong>Fix: eyes to the floor, chin tucked slightly.</strong>
      </>
    ),
  },
  {
    title: 'Not locking out at the top',
    fix: (
      <>
        Stopping 80% of the way up — the AI won&apos;t register the rep.{' '}
        <strong>Fix: fully extend your elbows at the top of every rep.</strong>
      </>
    ),
  },
]

const CHECKLIST: string[] = [
  'Full body is visible in the camera frame',
  'Head, torso, and feet in one straight line',
  'Hands shoulder-width, fingers pointing forward',
  'Core braced, glutes slightly squeezed',
  'Eyes to the floor, neck neutral',
  'AI readiness check shows green',
]

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
    { to: '/guides/pushup-variations', label: 'Pushup variations' },
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

export function PushupFormGuidePage() {
  const [activeId, setActiveId] = useState<string>(TOC_ITEMS[0].id)

  const scrollToId = useCallback((id: string) => {
    const el = document.getElementById(id)
    el?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [])

  useGuideSeo({
    title: PAGE_TITLE,
    description: META_DESCRIPTION,
    breadcrumbCurrentName: 'Pushup form',
    jsonLdScriptId: 'jsonld-breadcrumb-pushup-form',
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
      <InThisGuideCard onNavigate={scrollToId} />
    </>
  )

  return (
    <GuideShell
      breadcrumbCurrent="Pushup form"
      tocItems={TOC_ITEMS}
      activeTocId={activeId}
      onTocNavigate={scrollToId}
      sidebar={sidebar}
      bottomStrip={
        <section className="gdg-strip" aria-labelledby="gdg-strip-title">
          <h2 id="gdg-strip-title" className="gdg-strip__title">
            Form locked in? Now prove it.
          </h2>
          <p className="gdg-strip__sub">
            Record your first solo set — or go straight to a head-to-head challenge.
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
            <path
              d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"
              fill="currentColor"
            />
          </svg>
          Guide
        </div>
        <h1 className="gdg-hero__title">Proper pushup form</h1>
        <p className="gdg-hero__sub">
          Get every rep right — so the AI counts them, your body stays safe, and your score actually
          means something.
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
            Beginner friendly
          </span>
          <span className="gdg-hero__meta-item">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
              <path d="M9 2L7.17 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2h-3.17L15 2H9zm3 15c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5z" />
            </svg>
            AI-compatible
          </span>
        </div>
      </header>

      <section id="quick-reference" className="gdg-section">
        <div className="gdg-qr">
          <div className="gdg-qr__label">Quick reference</div>
          <div className="gdg-qr__grid">
            <div className="gdg-qr__cell">
              <div className="gdg-qr__cell-label">Starting position</div>
              <div className="gdg-qr__cell-value">Plank — head to heel in a straight line</div>
            </div>
            <div className="gdg-qr__cell">
              <div className="gdg-qr__cell-label">Hand placement</div>
              <div className="gdg-qr__cell-value">Shoulder-width or slightly wider</div>
            </div>
            <div className="gdg-qr__cell">
              <div className="gdg-qr__cell-label">Elbow angle</div>
              <div className="gdg-qr__cell-value">30–45° from torso (not flared)</div>
            </div>
            <div className="gdg-qr__cell">
              <div className="gdg-qr__cell-label">Valid rep depth</div>
              <div className="gdg-qr__cell-value">~90° elbow bend + full lockout</div>
            </div>
          </div>
        </div>
      </section>

      <section id="body-alignment" className="gdg-section">
        <p className="gdg-section__kicker">01 — Body alignment</p>
        <h2 className="gdg-section__title">Form a straight line head to heel</h2>
        <IllustrationPlaceholder caption="Illustration: side-view body alignment diagram" />
        <p className="gdg-prose">
          Start in a plank position. Your body should form a{' '}
          <strong>straight line from your head to your heels</strong> — not a V shape or a sagging
          curve. Brace your core as if you&apos;re about to take a punch, squeeze your glutes
          slightly, and keep your neck neutral.
        </p>
        <div className="gdg-callout--tip">
          <div className="gdg-callout__icon" aria-hidden />
          <p className="gdg-callout__text">
            <span className="gdg-callout__label">Pro tip: </span>
            Look at the floor about 6–8 inches ahead of your hands. This keeps your neck in line with
            your spine naturally — no craning required.
          </p>
        </div>
        <div className="gdg-callout--warn">
          <div className="gdg-callout__icon" aria-hidden />
          <p className="gdg-callout__text">
            <span className="gdg-callout__label">AI note: </span>
            The pose detection needs your full body in frame. If you&apos;re too close to the camera,
            reps won&apos;t register correctly. Step back until your knees are visible.
          </p>
        </div>
      </section>

      <section id="hand-position" className="gdg-section">
        <p className="gdg-section__kicker">02 — Hand position</p>
        <h2 className="gdg-section__title">Shoulder-width, fingers forward</h2>
        <IllustrationPlaceholder caption="Illustration: top-down hand placement diagram" />
        <p className="gdg-prose">
          Place your hands <strong>directly below your shoulders</strong>, or slightly wider. Fingers
          should point forward or turn out slightly — whichever feels natural for your wrists. Press
          your palms flat into the ground; don&apos;t let your wrists collapse inward.
        </p>
        <div className="gdg-callout--tip">
          <div className="gdg-callout__icon" aria-hidden />
          <p className="gdg-callout__text">
            <span className="gdg-callout__label">Pro tip: </span>
            Wider hands = more chest emphasis. Closer hands (diamond) = more tricep. For maximum reps
            in a challenge, standard shoulder-width is the most efficient.
          </p>
        </div>
      </section>

      <section id="depth" className="gdg-section">
        <p className="gdg-section__kicker">03 — Depth</p>
        <h2 className="gdg-section__title">Go low. Come all the way up.</h2>
        <IllustrationPlaceholder caption="Illustration: depth and lockout range" />
        <p className="gdg-prose">
          Lower your chest <strong>until your elbows reach approximately 90 degrees</strong>.
          Don&apos;t touch the floor — control the descent. At the top, fully lock out your elbows.
          Both phases matter: the AI checks descent depth AND the lockout position at the top.
        </p>
        <div className="gdg-callout--tip">
          <div className="gdg-callout__icon" aria-hidden />
          <p className="gdg-callout__text">
            <span className="gdg-callout__label">Why this matters in a challenge: </span>
            Partial reps don&apos;t count. Your opponent&apos;s AI uses the same standard as yours —
            so any rep that doesn&apos;t hit depth or full lockout is simply not scored.
          </p>
        </div>
        <div className="gdg-callout--warn">
          <div className="gdg-callout__icon" aria-hidden />
          <p className="gdg-callout__text">
            <span className="gdg-callout__label">If full depth is hard: </span>
            Elevate your hands on a bench or do knee pushups — keeping the same body line from knees
            to head. Build strength before going to the floor.
          </p>
        </div>
      </section>

      <section id="elbow-angle" className="gdg-section">
        <p className="gdg-section__kicker">04 — Elbow angle</p>
        <h2 className="gdg-section__title">30–45° from your torso. No wider.</h2>
        <IllustrationPlaceholder caption="Illustration: elbow angle (top view)" />
        <p className="gdg-prose">
          As you lower, your elbows should track at{' '}
          <strong>roughly 30–45° from your torso</strong> — not straight out to the sides. Flaring
          elbows to 90° puts unnecessary stress on the shoulder joint over time and is the most
          common form breakdown when fatigue sets in.
        </p>
        <div className="gdg-callout--tip">
          <div className="gdg-callout__icon" aria-hidden />
          <p className="gdg-callout__text">
            <span className="gdg-callout__label">Pro tip: </span>
            Think &apos;arrow&apos; not &apos;T&apos;. Your body from above should look like an arrow,
            not a scarecrow. This keeps your shoulders healthy through high-rep sets.
          </p>
        </div>
      </section>

      <section id="common-mistakes" className="gdg-section">
        <p className="gdg-section__kicker">05 — Common mistakes</p>
        <h2 className="gdg-section__title">What to fix before your first challenge</h2>
        {MISTAKES.map((m, i) => (
          <div key={m.title} className="gdg-mistake">
            <div className="gdg-mistake__num">{i + 1}</div>
            <div>
              <p className="gdg-mistake__title">{m.title}</p>
              <p className="gdg-mistake__fix">{m.fix}</p>
            </div>
          </div>
        ))}
      </section>

      <section id="pre-set-checklist" className="gdg-section">
        <p className="gdg-section__kicker">06 — Pre-set checklist</p>
        <h2 className="gdg-section__title">Run through this before you hit record</h2>
        {CHECKLIST.map((line) => (
          <div key={line} className="gdg-checklist__row">
            <span className="gdg-checklist__box" aria-hidden>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" />
              </svg>
            </span>
            {line}
          </div>
        ))}
      </section>
    </GuideShell>
  )
}
