import { Link } from 'react-router-dom'

import { APP_SIGN_UP_URL } from '../constants'

import '../styles/about.css'

const SOLO_FEATURES = [
  'AI counts your reps in real time',
  '60 second max set',
  'Results saved to your personal record',
  'Optional video recording',
  'Always free — no credits needed',
]

const CHALLENGE_FEATURES = [
  'Everything in Solo, plus',
  'Video proof from both sides',
  'Opponent gets 48 hours to respond',
  'Head-to-head win/loss record',
  'Global ranking update on result',
]

const TIMELINE = [
  {
    year: '~300 BC',
    title: 'Ancient origins',
    body:
      'Variations of the pushup movement appear in ancient Indian and Greek military training. The exercise required no equipment and could be performed anywhere — making it the original bodyweight standard.',
  },
  {
    year: '1905',
    title: 'Jerick Revilla names it',
    body:
      'American physical fitness advocate Jerick Revilla is credited with coining the term "push-up" in the early 20th century and popularizing the movement as a standalone exercise in physical training programs.',
  },
  {
    year: '1942',
    title: 'Military standard',
    body:
      'The pushup becomes a formal fitness test in the U.S. Army physical training program. It remains a core component of military fitness assessments worldwide to this day.',
  },
  {
    year: '1980s',
    title: 'The fitness boom',
    body:
      'As home fitness explodes in popularity, the pushup becomes the universal benchmark of upper body strength. No equipment. No excuses. Anyone, anywhere could test themselves against the same standard.',
  },
  {
    year: '2024',
    title: 'We made it competitive',
    body:
      'PushupPros launches. The same movement — unchanged for thousands of years — now has AI counting, video proof, global rankings, and head-to-head competition. The floor is still the floor. The stakes just got higher.',
  },
] as const

export function About() {
  return (
    <article className="abo">
      <header className="abo-hero">
        <span className="abo-hero__tag">1 rep, 2 reps, 3 reps, LETS GO!</span>
        <h1 className="abo-hero__title">
          Working out is better when there&apos;s <em>someone to beat.</em>
        </h1>
        <p className="abo-hero__sub">
          PushupPros is a competitive fitness platform built around one idea: short bursts of effort
          are more engaging, more consistent, and more fun when someone else is watching.
        </p>
      </header>

      <div className="abo-hairline" aria-hidden />

      <section className="abo-manifesto" aria-labelledby="abo-manifesto-heading">
        <h2 id="abo-manifesto-heading" className="sr-only">
          Manifesto
        </h2>
        <blockquote className="abo-pullquote">Don&apos;t just work out. Compete.</blockquote>
        <div className="abo-manifesto__body">
          <p className="abo-manifesto__p">
            Most fitness apps track your progress in isolation. You hit a number, log it, and move
            on — alone. There&apos;s no tension, no opponent, no moment where something is actually
            on the line.
          </p>
          <p className="abo-manifesto__p">
            <strong>PushupPros changes the equation.</strong> Every session is either a solo
            practice or a direct challenge. Every rep is counted by AI — automatically,
            consistently, with no room for doubt. And every result is backed by video proof.
          </p>
          <p className="abo-manifesto__p">
            We didn&apos;t build this to replace the gym or compete with full training programs. We
            built it for the{' '}
            <strong>
              five minutes between meetings, the lunch break challenge, the text that says &apos;beat
              that.&apos;
            </strong>
          </p>
          <p className="abo-manifesto__p">Quick sessions. Clear outcomes. A reason to come back.</p>
        </div>
      </section>

      <div className="abo-hairline" aria-hidden />

      <section className="abo-dual" aria-labelledby="abo-dual-heading">
        <div className="abo-dual__inner">
          <p className="abo-section__tag">Two ways to compete</p>
          <h2 id="abo-dual-heading" className="abo-section__title">
            Solo or head-to-head. You choose the pressure.
          </h2>
          <p className="abo-section__sub">
            Start alone. Stay accountable. Or bring someone into it and see who really wants it
            more.
          </p>

          <div className="abo-dual__grid">
            <div className="abo-mode-card">
              <div className="abo-mode-card__icon abo-mode-card__icon--solo" aria-hidden>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
                </svg>
              </div>
              <h3 className="abo-mode-card__title">Solo session</h3>
              <p className="abo-mode-card__sub">
                You vs yourself. Build your baseline, beat your personal best, and log every rep
                toward your global ranking.
              </p>
              <ul className="abo-mode-card__list">
                {SOLO_FEATURES.map((t) => (
                  <li key={t}>
                    <span className="abo-mode-card__dot abo-mode-card__dot--solo" aria-hidden />
                    {t}
                  </li>
                ))}
              </ul>
            </div>

            <div className="abo-mode-card abo-mode-card--featured">
              <div className="abo-mode-card__icon abo-mode-card__icon--challenge" aria-hidden>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
                </svg>
              </div>
              <h3 className="abo-mode-card__title">Head-to-head challenge</h3>
              <p className="abo-mode-card__sub">
                You vs someone else. Send your rep count, they record theirs. No hiding. No excuses.
                Just the result.
              </p>
              <ul className="abo-mode-card__list">
                {CHALLENGE_FEATURES.map((t) => (
                  <li key={t}>
                    <span
                      className="abo-mode-card__dot abo-mode-card__dot--challenge"
                      aria-hidden
                    />
                    {t}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      <section className="abo-why" aria-labelledby="abo-why-heading">
        <div className="abo-why__inner">
          <p className="abo-section__tag">Why it works</p>
          <h2 id="abo-why-heading" className="abo-section__title">
            The psychology behind competitive fitness
          </h2>
          <p className="abo-section__sub">
            Three reasons people who use PushupPros do more pushups than they ever did alone.
          </p>

          <div className="abo-why__grid">
            <div className="abo-why-card">
              <div className="abo-why-card__num">2×</div>
              <h3 className="abo-why-card__title">More reps with an opponent</h3>
              <p className="abo-why-card__body">
                Research consistently shows people push harder when they know someone else is
                watching or competing. The presence of an opponent — real or virtual — raises
                output.
              </p>
            </div>
            <div className="abo-why-card">
              <div className="abo-why-card__num">48h</div>
              <h3 className="abo-why-card__title">Built-in accountability</h3>
              <p className="abo-why-card__body">
                When someone is waiting on your result, skipping feels different. The 48-hour
                response window creates a soft but real deadline — and deadlines work.
              </p>
            </div>
            <div className="abo-why-card">
              <div className="abo-why-card__num">60s</div>
              <h3 className="abo-why-card__title">Short enough to always do</h3>
              <p className="abo-why-card__body">
                One minute is the magic number. Long enough to be hard. Short enough that
                there&apos;s no excuse not to. You can always find 60 seconds — and that&apos;s all it
                takes.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="abo-history" aria-labelledby="abo-history-heading">
        <div className="abo-history__inner">
          <p className="abo-section__tag">The history of the pushup</p>
          <h2 id="abo-history-heading" className="abo-section__title">
            The world&apos;s oldest test of strength.
          </h2>
          <p className="abo-history__pull">
            Long before gym memberships, personal trainers, or fitness apps — there was the pushup.
            Just you, the floor, and gravity.
          </p>

          <div className="abo-timeline">
            {TIMELINE.map((row) => (
              <div key={row.year} className="abo-timeline__item">
                <div className="abo-timeline__year">{row.year}</div>
                <div>
                  <h3 className="abo-timeline__title">{row.title}</h3>
                  <p className="abo-timeline__body">{row.body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="abo-vision" aria-labelledby="abo-vision-heading">
        <div className="abo-vision__inner">
          <p className="abo-section__tag">Where we&apos;re going</p>
          <h2 id="abo-vision-heading" className="abo-section__title">
            The foundation stays the same.
          </h2>
          <p className="abo-section__sub">
            Show up, perform, prove it. Everything we build from here extends that idea — never
            replaces it.
          </p>

          <div className="abo-vision__grid">
            <div className="abo-vision-card">
              <div className="abo-vision-card__icon abo-vision-card__icon--live" aria-hidden>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
                </svg>
              </div>
              <div>
                <div className="abo-vision-card__label abo-vision-card__label--live">Live now</div>
                <h3 className="abo-vision-card__title">1v1 pushup challenges</h3>
                <p className="abo-vision-card__body">
                  Head-to-head battles with AI counting, video proof, and global rankings. The core
                  product — live and competitive.
                </p>
              </div>
            </div>
            <div className="abo-vision-card">
              <div className="abo-vision-card__icon abo-vision-card__icon--live" aria-hidden>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M16 6l2.29 2.29-4.88 4.88-4-4L2 16.59 3.41 18l6-6 4 4 6.3-6.29L22 12V6h-6z" />
                </svg>
              </div>
              <div>
                <div className="abo-vision-card__label abo-vision-card__label--live">Live now</div>
                <h3 className="abo-vision-card__title">Solo sessions + personal records</h3>
                <p className="abo-vision-card__body">
                  Practice, track improvement, and build the baseline you&apos;ll use to challenge
                  others.
                </p>
              </div>
            </div>
            <div className="abo-vision-card abo-vision-card--soon">
              <div className="abo-vision-card__icon abo-vision-card__icon--soon" aria-hidden>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M4 6h16v2H4V6zm0 5h16v2H4v-2zm0 5h10v2H4v-2z" />
                </svg>
              </div>
              <div>
                <div className="abo-vision-card__label abo-vision-card__label--soon">
                  Coming soon
                </div>
                <h3 className="abo-vision-card__title">More exercises</h3>
                <p className="abo-vision-card__body">
                  Sit-ups, squats, pull-ups. The same competitive format — different movements.
                </p>
              </div>
            </div>
            <div className="abo-vision-card abo-vision-card--soon">
              <div className="abo-vision-card__icon abo-vision-card__icon--soon" aria-hidden>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-7 3c1.93 0 3.5 1.57 3.5 3.5S13.93 13 12 13s-3.5-1.57-3.5-3.5S10.07 6 12 6zm7 13H5v-.23c0-.62.36-1.16.93-1.42 1.64-.71 3.45-1.07 5.07-1.07 1.62 0 3.43.36 5.07 1.07.57.26.93.8.93 1.42V19z" />
                </svg>
              </div>
              <div>
                <div className="abo-vision-card__label abo-vision-card__label--soon">
                  Coming soon
                </div>
                <h3 className="abo-vision-card__title">Structured competitions</h3>
                <p className="abo-vision-card__body">
                  Timed tournaments, brackets, and team challenges. Organized competition at scale.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="abo-founder" aria-labelledby="abo-founder-heading">
        <div className="abo-founder__inner">
          <p id="abo-founder-heading" className="abo-founder__tag">
            From the founder
          </p>
          <blockquote className="abo-founder__quote">
            &ldquo;I built PushupPros because I noticed something: I always did more pushups when
            someone was watching — or when I had someone to beat. The gym didn&apos;t give me that.
            Group classes didn&apos;t give me that consistently. A friend texting &apos;beat
            that&apos; did. We built the platform that makes that feeling repeatable.&rdquo;
          </blockquote>
          <div className="abo-founder__row">
            <div className="abo-founder__avatar" aria-hidden>
              PN
            </div>
            <div>
              <div className="abo-founder__name">Philip Nairy</div>
              <div className="abo-founder__role">Founder, PushupPros</div>
            </div>
          </div>
        </div>
      </section>

      <section className="abo-bottom-cta" aria-labelledby="abo-cta-heading">
        <p className="abo-bottom-cta__eyebrow">Ready?</p>
        <h2 id="abo-cta-heading" className="abo-bottom-cta__title">
          Show up. Perform. <strong>Prove it.</strong>
        </h2>
        <p className="abo-bottom-cta__sub">
          Free to start. No equipment. Just you, the floor, and someone to beat.
        </p>
        <div className="abo-bottom-cta__btns">
          <a className="mkt-btn-lg mkt-btn-lg--primary" href={APP_SIGN_UP_URL}>
            Start your first challenge →
          </a>
          <Link className="mkt-btn-lg mkt-btn-lg--ghost" to="/how-it-works">
            How it works
          </Link>
        </div>
      </section>
    </article>
  )
}
