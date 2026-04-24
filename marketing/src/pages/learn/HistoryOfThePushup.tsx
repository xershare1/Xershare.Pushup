import type { ReactNode } from 'react'
import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'

import { GuideShell } from '../../components/guides/GuideShell'
import { useGuideSeo } from '../../components/guides/useGuideSeo'
import { APP_SIGN_UP_URL } from '../../constants'

import '../../styles/guide-history.css'

const PAGE_TITLE = 'History of the Pushup — From Ancient Training to AI | PushupPros'
const META_DESCRIPTION =
  'The complete history of the pushup — from ancient Indian wrestling in 300 BC to U.S. military fitness tests to AI rep counting. 2,300 years in one page.'

const BREADCRUMB_JSON = 'History of the pushup'

const TOC_ITEMS: { id: string; label: string }[] = [
  { id: 'oldest-exercise', label: 'The oldest exercise' },
  { id: 'ancient-origins', label: 'Ancient origins' },
  { id: 'military-adoption', label: 'Military adoption' },
  { id: 'fitness-boom', label: 'The fitness boom' },
  { id: 'modern-records', label: 'Modern records' },
  { id: 'ai-era', label: 'The AI era' },
  { id: 'fast-facts', label: 'Fast facts' },
]

const TIMELINE: { year: string; title: string; highlight: boolean; body: ReactNode }[] = [
  {
    year: '~300 BC',
    highlight: false,
    title: 'Ancient Indian wrestling training',
    body: (
      <>
        The <strong>Dand</strong> becomes a staple of Indian wrestler conditioning. Practiced in
        volumes of hundreds per day, it forms the basis of <em>Vyayama</em> — the earliest recorded
        structured bodyweight training system.
      </>
    ),
  },
  {
    year: '~100 AD',
    highlight: false,
    title: 'Roman legions',
    body: (
      <>
        Roman military training manuals describe calisthenic drills including prone pressing
        movements. Soldiers needed field-ready conditioning with no equipment — the pushup was the
        solution.
      </>
    ),
  },
  {
    year: '1905',
    highlight: false,
    title: 'Jerick Revilla coins "push-up"',
    body: (
      <>
        American physical fitness advocate <strong>Jerick Revilla</strong> is credited with coining
        the term &quot;push-up&quot; in the early 20th century and standardizing the movement as a
        standalone exercise in formal training programs — not just a component of larger movements.
      </>
    ),
  },
  {
    year: '1942',
    highlight: false,
    title: 'U.S. Army Physical Training Program',
    body: (
      <>
        The pushup becomes a <strong>formal fitness test</strong> in the U.S. Army&apos;s official
        training program. For the first time, a standardized rep count is used to assess soldier
        readiness. This is the moment the pushup becomes a measurable, competitive standard — not
        just an exercise.
      </>
    ),
  },
  {
    year: '1960s',
    highlight: false,
    title: 'School fitness testing',
    body: (
      <>
        The pushup enters standardized school physical education across the U.S. and Europe. For the
        first time, an entire generation grows up with a pushup benchmark — creating the cultural
        idea that &quot;how many pushups can you do?&quot; is a meaningful question.
      </>
    ),
  },
  {
    year: '1980s',
    highlight: true,
    title: 'The fitness boom makes it universal',
    body: (
      <>
        As home fitness explodes in popularity, the pushup becomes the{' '}
        <strong>universal benchmark of upper body strength</strong>. No gym required. No equipment. No
        cost. Jane Fonda, Arnold Schwarzenegger, and military fitness programs all include it. The
        pushup reaches maximum cultural saturation.
      </>
    ),
  },
  {
    year: '2000s',
    highlight: false,
    title: 'Digital fitness tracking begins',
    body: (
      <>
        The first smartphone fitness apps appear. People begin logging workouts digitally — but rep
        counting is still manual and honor-based. No verification. No proof. Just a number someone
        typed in.
      </>
    ),
  },
  {
    year: '2024',
    highlight: true,
    title: 'AI counting and competitive challenges',
    body: (
      <>
        <strong>PushupPros launches.</strong> For the first time, every rep is automatically counted
        by AI using pose estimation — no manual logging, no honor system. Video proof is recorded.
        Global rankings track competitive performance. The 2,300-year-old exercise becomes
        verifiable, competitive, and social — for anyone, anywhere, with just a phone.
      </>
    ),
  },
]

function IllusAncient() {
  return (
    <figure
      className="gdg-illus"
      aria-label="Illustration: ancient Indian dand baithak movement"
    >
      <div className="gdg-illus__icon" aria-hidden>
        <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
          <path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3 3.5-4.5 4.5 6H5l3.5-4.5z" />
        </svg>
      </div>
      <figcaption className="gdg-illus__cap">Illustration: ancient Indian dand baithak movement</figcaption>
    </figure>
  )
}

function RecordIcon({ variant }: { variant: 'star' | 'clock' }) {
  if (variant === 'star') {
    return (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
        <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21 12 17.27z" />
      </svg>
    )
  }
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10 10-4.5 10-10S17.5 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm.5-13H11v5.59l3.3 3.3 1.41-1.41L12.5 10.59V7z" />
    </svg>
  )
}

function SidebarCta() {
  return (
    <div className="gdg-cta-card">
      <p className="gdg-cta-card__title">Be part of the history</p>
      <p className="gdg-cta-card__sub">
        2,300 years of pushups. Now with AI counting and global rankings.
      </p>
      <a className="gdg-cta-card__btn" href={APP_SIGN_UP_URL}>
        Start your first challenge →
      </a>
    </div>
  )
}

function SidebarFastFacts() {
  const rows = [
    { k: 'Origins', v: '~300 BC' },
    { k: 'Named', v: '1905' },
    { k: 'Military standard', v: '1942' },
    { k: '1-min world record', v: '140 reps' },
    { k: '24-hr world record', v: '46,001' },
    { k: 'AI era begins', v: '2024' },
  ]
  return (
    <div className="gdg-hist-sb-facts">
      <div className="gdg-hist-sb-facts__title">Fast facts</div>
      {rows.map((r) => (
        <div key={r.k} className="gdg-hist-sb-facts__row">
          <span className="gdg-hist-sb-facts__k">{r.k}</span>
          <span className="gdg-hist-sb-facts__v">{r.v}</span>
        </div>
      ))}
    </div>
  )
}

function MoreGuidesCard() {
  const links = [
    { to: '/guides/pushup-form', label: 'Pushup form' },
    { to: '/guides/pushup-variations', label: 'Variations' },
    { to: '/guides/training-tips', label: 'Training tips' },
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

export function HistoryOfThePushupPage() {
  const [activeId, setActiveId] = useState<string>(TOC_ITEMS[0].id)

  const scrollToId = useCallback((id: string) => {
    const el = document.getElementById(id)
    el?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [])

  useGuideSeo({
    title: PAGE_TITLE,
    description: META_DESCRIPTION,
    breadcrumbCurrentName: BREADCRUMB_JSON,
    jsonLdScriptId: 'jsonld-breadcrumb-history-of-pushup',
    middleSegment: { name: 'Learn', itemPath: '/learn' },
    articleJsonLd: {
      scriptId: 'jsonld-article-history-of-pushup',
      pagePath: '/learn/history',
      datePublished: '2026-04-20T12:00:00.000Z',
      headline: PAGE_TITLE,
    },
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
      <SidebarFastFacts />
      <MoreGuidesCard />
      <InThisGuideCard onNavigate={scrollToId} />
    </>
  )

  return (
    <GuideShell
      breadcrumbCurrent="History of the pushup"
      breadcrumbMid={{ label: 'Learn', to: '/learn' }}
      mobileBack={{ label: 'Learn', to: '/learn' }}
      tocItems={TOC_ITEMS}
      activeTocId={activeId}
      onTocNavigate={scrollToId}
      sidebar={sidebar}
      bottomStrip={
        <section className="gdg-strip" aria-labelledby="gdg-hist-strip-title">
          <h2 id="gdg-hist-strip-title" className="gdg-strip__title">
            2,300 years of history. Your turn.
          </h2>
          <p className="gdg-strip__sub">
            The floor hasn&apos;t changed. The stakes just got higher. Challenge someone.
          </p>
          <div className="gdg-strip__btns">
            <a className="mkt-btn-lg mkt-btn-lg--primary" href={APP_SIGN_UP_URL}>
              Start a challenge →
            </a>
            <Link className="mkt-btn-lg mkt-btn-lg--ghost" to="/learn/world-records">
              View world records
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
        <h1 className="gdg-hero__title">History of the pushup</h1>
        <p className="gdg-hero__sub">
          From ancient Indian wrestling training to AI rep counting — the pushup has outlasted every
          fitness trend in human history. Here&apos;s why.
        </p>
        <div className="gdg-hero__meta">
          <span className="gdg-hero__meta-item">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
              <path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z" />
            </svg>
            8 min read
          </span>
          <span className="gdg-hero__meta-item">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
              <path d="M8 2h8v2H8V2zm-2 4h12v2H6V6zm-2 4h16v8c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V10zm3 2v6h10v-6H5z" />
            </svg>
            Fascinating read
          </span>
          <span className="gdg-hero__meta-item">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
              <path d="M10 2h4v2h-4V2zm0 18h4v2h-4v-2zM2 10h2v4H2v-4zm18 0h2v4h-2v-4zM4.22 4.22l1.42 1.42L3.5 7.5 2.08 6.08 4.22 4.22zm14.14 0l1.42 1.42L20.5 7.5l-1.42 1.42-1.42-1.42 1.42-1.42z" />
            </svg>
            ~2,300 years of history
          </span>
        </div>
      </header>

      <blockquote className="gdg-hist-pullquote">
        <p>
          &ldquo;The pushup requires nothing but a body and a floor. That&apos;s why it&apos;s survived
          every century, every war, every fitness trend — and why it still matters today.&rdquo;
        </p>
      </blockquote>

      <section id="oldest-exercise" className="gdg-section">
        <p className="gdg-section__kicker">01 — The oldest exercise</p>
        <h2 className="gdg-section__title">No equipment. No excuses. For 2,300 years.</h2>
        <p className="gdg-prose">
          The pushup is arguably the oldest structured exercise in human history. Unlike weights,
          machines, or resistance bands — all of which require manufacturing, trade, and infrastructure
          — the pushup requires nothing. <strong>A body. Gravity. The floor.</strong>
        </p>
        <p className="gdg-prose">
          That simplicity is the reason it has never gone away. Through ancient empires, world wars,
          the invention of the gym, and the explosion of fitness technology — the pushup is still
          here, unchanged.
        </p>
        <div className="gdg-hist-facts">
          <div className="gdg-hist-fact">
            <div className="gdg-hist-fact__num">~300 BC</div>
            <p className="gdg-hist-fact__label">Earliest recorded pushup-like movements in Indian training</p>
          </div>
          <div className="gdg-hist-fact">
            <div className="gdg-hist-fact__num">2,300+</div>
            <p className="gdg-hist-fact__label">Years the movement has been in continuous use globally</p>
          </div>
          <div className="gdg-hist-fact">
            <div className="gdg-hist-fact__num">0</div>
            <p className="gdg-hist-fact__label">Equipment needed. Then, now, and forever.</p>
          </div>
        </div>
      </section>

      <section id="ancient-origins" className="gdg-section">
        <p className="gdg-section__kicker">02 — Ancient origins</p>
        <h2 className="gdg-section__title">India, Greece, and the birth of bodyweight training</h2>
        <IllusAncient />
        <p className="gdg-prose">
          The earliest known ancestor of the pushup is the <strong>Dand</strong> (also called Hindu
          pushup), a movement practiced by Indian wrestlers as part of a daily training system
          called <em>Vyayama</em>. These weren&apos;t casual exercises — wrestlers performed hundreds
          or thousands of dands per day as the foundation of their conditioning.
        </p>
        <p className="gdg-prose">
          Greek and Roman military training independently developed similar movements. Soldiers needed
          upper body strength for shield combat and needed to build it without equipment in the field.
          The pushup — or something functionally identical — was the natural solution in every
          culture that needed fighting men to be strong.
        </p>
        <div className="gdg-callout--tip">
          <div className="gdg-callout__icon" aria-hidden />
          <p className="gdg-callout__text">
            <span className="gdg-callout__label">The Hindu pushup (Dand): </span>
            It&apos;s still practiced today. It&apos;s a larger movement than the standard pushup —
            involving a wave-like motion through the hips. Some yoga sun salutations are derived from
            the same movement pattern.
          </p>
        </div>
      </section>

      <section id="military-adoption" className="gdg-section">
        <p className="gdg-section__kicker">03 — Military adoption</p>
        <h2 className="gdg-section__title">How armies turned the pushup into a global standard</h2>
        <p className="gdg-prose">
          The pushup&apos;s rise to universal adoption came through military training. When armies
          needed to assess and build soldier fitness at scale — across thousands of recruits with no
          equipment and no gyms — the pushup became the answer in country after country.
        </p>
        <div className="gdg-hist-tl">
          {TIMELINE.map((row) => (
            <div
              key={`${row.year}-${row.title}`}
              className={
                row.highlight
                  ? 'gdg-hist-tl__item gdg-hist-tl__item--highlight'
                  : 'gdg-hist-tl__item'
              }
            >
              <div className="gdg-hist-tl__left">
                <p className="gdg-hist-tl__year">{row.year}</p>
                <span className="gdg-hist-tl__dot" aria-hidden />
              </div>
              <div className="gdg-hist-tl__right">
                <h3 className="gdg-hist-tl__title">{row.title}</h3>
                <p className="gdg-hist-tl__body">{row.body}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section id="fitness-boom" className="gdg-section">
        <p className="gdg-section__kicker">04 — The fitness boom</p>
        <h2 className="gdg-section__title">Why the pushup survived while everything else changed</h2>
        <p className="gdg-prose">
          Every decade produces a new fitness trend. Step aerobics. Nautilus machines. P90X. CrossFit.
          HIIT. Pilates. Functional training. The list is endless — and most of these trends fade
          within a generation.
        </p>
        <p className="gdg-prose">
          <strong>The pushup never fades.</strong> The reason is structural: it requires nothing
          external. While every other fitness modality requires equipment, space, money, or
          infrastructure — the pushup&apos;s only inputs are gravity and a human body. That makes it
          recession-proof, travel-proof, and immune to supply chain disruptions.
        </p>
        <p className="gdg-prose">
          During COVID-19 lockdowns in 2020, when gyms worldwide closed for months, pushup searches on
          Google spiked to decade highs. When everything else became unavailable, people went back to
          the floor.
        </p>
      </section>

      <section id="modern-records" className="gdg-section">
        <p className="gdg-section__kicker">05 — Modern records</p>
        <h2 className="gdg-section__title">The numbers that define the limits of human performance</h2>
        <p className="gdg-prose">
          World records give the pushup something it never historically had: an upper bound. A number
          that answers &apos;how far can this actually go?&apos; The answer, as it turns out, is very
          far.
        </p>
        <div className="gdg-hist-recs">
          <div className="gdg-hist-rec gdg-hist-rec--feat">
            <div className="gdg-hist-rec__icon gdg-hist-rec__icon--star" aria-hidden>
              <RecordIcon variant="star" />
            </div>
            <div className="gdg-hist-rec__body">
              <p className="gdg-hist-rec__title">Most in 24 hours (male)</p>
              <p className="gdg-hist-rec__detail">Charles Servizio, USA — 1993</p>
            </div>
            <div className="gdg-hist-rec__nums">
              <div>
                <div className="gdg-hist-rec__num">46,001</div>
                <p className="gdg-hist-rec__label">pushups</p>
              </div>
            </div>
          </div>
          <div className="gdg-hist-rec">
            <div className="gdg-hist-rec__icon gdg-hist-rec__icon--clock" aria-hidden>
              <RecordIcon variant="clock" />
            </div>
            <div className="gdg-hist-rec__body">
              <p className="gdg-hist-rec__title">Most in 1 hour (male)</p>
              <p className="gdg-hist-rec__detail">Jarrad Young, Australia — 2021</p>
            </div>
            <div className="gdg-hist-rec__nums">
              <div>
                <div className="gdg-hist-rec__num">3,182</div>
                <p className="gdg-hist-rec__label">pushups</p>
              </div>
            </div>
          </div>
          <div className="gdg-hist-rec">
            <div className="gdg-hist-rec__icon gdg-hist-rec__icon--clock" aria-hidden>
              <RecordIcon variant="clock" />
            </div>
            <div className="gdg-hist-rec__body">
              <p className="gdg-hist-rec__title">Most in 1 minute (male)</p>
              <p className="gdg-hist-rec__detail">Carlton Williams, UK — 2014</p>
            </div>
            <div className="gdg-hist-rec__nums">
              <div>
                <div className="gdg-hist-rec__num">140</div>
                <p className="gdg-hist-rec__label">pushups</p>
              </div>
            </div>
          </div>
          <div className="gdg-hist-rec">
            <div className="gdg-hist-rec__icon gdg-hist-rec__icon--clock" aria-hidden>
              <RecordIcon variant="clock" />
            </div>
            <div className="gdg-hist-rec__body">
              <p className="gdg-hist-rec__title">Most in 1 minute (female)</p>
              <p className="gdg-hist-rec__detail">Eva Clarke, Australia — 2014</p>
            </div>
            <div className="gdg-hist-rec__nums">
              <div>
                <div className="gdg-hist-rec__num">83</div>
                <p className="gdg-hist-rec__label">pushups</p>
              </div>
            </div>
          </div>
        </div>
        <div className="gdg-callout--tip">
          <div className="gdg-callout__icon" aria-hidden />
          <p className="gdg-callout__text">
            <span className="gdg-callout__label">PushupPros challenges are 60 seconds. </span>
            The world record for 1 minute is 140 reps — averaging 2.3 reps per second without
            stopping. If your personal best is 30, you&apos;re doing about 1 rep every 2 seconds.
            That&apos;s a real, achievable gap to close.
          </p>
        </div>
      </section>

      <section id="ai-era" className="gdg-section">
        <p className="gdg-section__kicker">06 — The AI era</p>
        <h2 className="gdg-section__title">The last thing the pushup was missing was verification</h2>
        <p className="gdg-prose">
          For 2,300 years, the pushup had one unsolved problem:{' '}
          <strong>you had to trust the count.</strong> A training partner counted for you. Or you
          counted yourself. Both were imperfect — subject to distraction, dishonesty, or
          fatigue-induced miscounting.
        </p>
        <p className="gdg-prose">
          Military fitness tests solved this by using human judges — official observers who watched
          and counted. But that required another person in the room. The challenge of bringing social,
          verified fitness competition to everyday people remained unsolved until pose estimation
          became available on consumer devices.
        </p>
        <p className="gdg-prose">
          Today, a smartphone camera can track 14 body landmarks at 30 frames per second, detect when
          elbow flexion reaches ~90 degrees, verify full lockout at the top, and count a rep — all in
          under 100 milliseconds.{' '}
          <strong>
            The thing that took a trained human observer to verify can now happen automatically,
            anywhere, on a device that fits in a pocket.
          </strong>
        </p>
        <p className="gdg-prose">
          That&apos;s what PushupPros is built on. The movement hasn&apos;t changed. The accountability
          — finally — has.
        </p>
      </section>

      <section id="fast-facts" className="gdg-section">
        <p className="gdg-section__kicker">07 — Fast facts</p>
        <h2 className="gdg-section__title">Things worth knowing</h2>
        <div className="gdg-hist-facts">
          <div className="gdg-hist-fact">
            <div className="gdg-hist-fact__num">72</div>
            <p className="gdg-hist-fact__label">Muscles activated during a standard pushup</p>
          </div>
          <div className="gdg-hist-fact">
            <div className="gdg-hist-fact__num">~1%</div>
            <p className="gdg-hist-fact__label">Of your bodyweight lifted per rep (rough estimate)</p>
          </div>
          <div className="gdg-hist-fact">
            <div className="gdg-hist-fact__num">3.5</div>
            <p className="gdg-hist-fact__label">Average seconds per rep at a sustainable competition pace</p>
          </div>
        </div>
        <div className="gdg-hist-facts">
          <div className="gdg-hist-fact">
            <div className="gdg-hist-fact__num">1942</div>
            <p className="gdg-hist-fact__label">Year the pushup became a formal U.S. military fitness test</p>
          </div>
          <div className="gdg-hist-fact">
            <div className="gdg-hist-fact__num">46k</div>
            <p className="gdg-hist-fact__label">Pushups in 24 hours — the world record</p>
          </div>
          <div className="gdg-hist-fact">
            <div className="gdg-hist-fact__num">0</div>
            <p className="gdg-hist-fact__label">Pieces of equipment required. In any era.</p>
          </div>
        </div>
      </section>
    </GuideShell>
  )
}
