import { Link } from 'react-router-dom'

import { APP_CREDITS_URL, APP_SIGN_UP_URL } from '../constants'

const LB_ROWS = [
  { rank: 1, name: 'IronMike', reps: 2840, delta: '+124' },
  { rank: 2, name: 'repking', reps: 2712, delta: '+98' },
  { rank: 3, name: 'pushuppro22', reps: 2590, delta: '+76' },
  { rank: 4, name: 'you_next', reps: 2411, delta: '+52' },
]

export function Home() {
  return (
    <>
      <section className="mkt-hero">
        <div className="mkt-hero__eyebrow">
          <span className="mkt-hero__pulse" aria-hidden />
          Live challenges · AI rep counting
        </div>
        <h1 className="mkt-hero__title">
          The world&apos;s oldest test of strength. <em>Now competitive.</em>
        </h1>
        <p className="mkt-hero__sub">
          Challenge friends to head-to-head pushup battles. AI counts your reps. Video proves it.
          No excuses.
        </p>
        <div className="mkt-hero__ctas">
          <a className="mkt-btn-lg mkt-btn-lg--primary" href={APP_SIGN_UP_URL}>
            Issue your first challenge →
          </a>
          <Link className="mkt-btn-lg mkt-btn-lg--ghost" to="/#live-battle">
            Watch a live battle
          </Link>
        </div>

        <div id="live-battle" className="mkt-battle">
          <div className="mkt-battle__head">
            <div className="mkt-battle__live">
              <span className="mkt-hero__pulse" aria-hidden />
              Live now
            </div>
            <span className="mkt-battle__time">0:38 remaining</span>
          </div>
          <div className="mkt-battle__arena">
            <div className="mkt-battle__fighter">
              <div className="mkt-battle__avatar" aria-hidden />
              <div className="mkt-battle__name">You</div>
              <div className="mkt-battle__score mkt-battle__score--win">42</div>
            </div>
            <div className="mkt-battle__vs">VS</div>
            <div className="mkt-battle__fighter">
              <div className="mkt-battle__avatar mkt-battle__avatar--b" aria-hidden />
              <div className="mkt-battle__name">Opponent</div>
              <div className="mkt-battle__score mkt-battle__score--lose">28</div>
            </div>
          </div>
          <div className="mkt-battle__progress-wrap" aria-hidden>
            <div className="mkt-battle__progress-lose" />
            <div className="mkt-battle__progress-win" />
          </div>
        </div>
      </section>

      <div className="mkt-stats">
        <div className="mkt-stats__item">
          <div className="mkt-stats__num">14,832</div>
          <div className="mkt-stats__label">Active challengers</div>
        </div>
        <div className="mkt-stats__item">
          <div className="mkt-stats__num">2.1M</div>
          <div className="mkt-stats__label">Pushups logged</div>
        </div>
        <div className="mkt-stats__item">
          <div className="mkt-stats__num">8,401</div>
          <div className="mkt-stats__label">Battles today</div>
        </div>
        <div className="mkt-stats__item">
          <div className="mkt-stats__num">99ms</div>
          <div className="mkt-stats__label">AI rep detection</div>
        </div>
      </div>

      <section className="mkt-section mkt-section--alt">
        <div className="mkt-section__inner">
          <p className="mkt-section__tag">How it works</p>
          <h2 className="mkt-section__title">Three steps to glory</h2>
          <p className="mkt-section__sub">From couch to competitor in under a minute.</p>

          <div className="mkt-steps">
            <div className="mkt-step">
              <div className="mkt-step__label">Step 01</div>
              <div className="mkt-step__icon" aria-hidden>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M12 4v4m0 8v4M8 8l-2-2m10 10l-2-2M4 12h4m8 0h4M8 16l-2 2m10-10l-2 2"
                    stroke="currentColor"
                    strokeWidth="1.75"
                    strokeLinecap="round"
                  />
                </svg>
              </div>
              <h3 className="mkt-step__heading">Record your pushups</h3>
              <p className="mkt-step__body">
                Open the app, get into position. Our AI detects your pose and counts every rep in
                real time — no manual input needed.
              </p>
            </div>
            <div className="mkt-step">
              <div className="mkt-step__label">Step 02</div>
              <div className="mkt-step__icon" aria-hidden>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M4 12v8h16v-8M12 4v12M8 8l4-4 4 4"
                    stroke="currentColor"
                    strokeWidth="1.75"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
              <h3 className="mkt-step__heading">Challenge someone</h3>
              <p className="mkt-step__body">
                Send your result to a friend, a rival, or anyone on the leaderboard. They get your
                video — now they have to beat it.
              </p>
            </div>
            <div className="mkt-step">
              <div className="mkt-step__label">Step 03</div>
              <div className="mkt-step__icon" aria-hidden>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M12 3l2.4 7.4H22l-6 4.6 2.3 7L12 17.8 5.7 22l2.3-7-6-4.6h7.6L12 3z"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
              <h3 className="mkt-step__heading">Win. Climb. Repeat.</h3>
              <p className="mkt-step__body">
                Results are logged, ranked, and shared. Your record is public. Your reputation is on
                the line every single time.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="mkt-section mkt-section--base mkt-features__head">
        <div className="mkt-section__inner">
          <p className="mkt-section__tag">Built different</p>
          <h2 className="mkt-section__title">No gym. No equipment. No excuses.</h2>
          <p className="mkt-section__sub">Everything you need to compete — and nothing you don&apos;t.</p>

          <div className="mkt-features__grid">
            <div className="mkt-feature">
              <div
                className="mkt-feature__icon"
                style={{
                  background: 'rgba(255,87,34,0.1)',
                  color: '#ff5722',
                }}
                aria-hidden
              >
                <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
                </svg>
              </div>
              <h3 className="mkt-feature__title">AI counts in real time</h3>
              <p className="mkt-feature__body">
                Pose estimation runs at 30fps. Every rep is detected the moment you complete it —
                accurate to within a fraction of a second.
              </p>
            </div>

            <div className="mkt-feature">
              <div
                className="mkt-feature__icon"
                style={{
                  background: 'rgba(76,175,80,0.1)',
                  color: '#4caf50',
                }}
                aria-hidden
              >
                <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm-2 16l-4-4 1.41-1.41L10 14.17l6.59-6.59L18 9l-8 8z" />
                </svg>
              </div>
              <h3 className="mkt-feature__title">Video proof. No cheating.</h3>
              <p className="mkt-feature__body">
                Every set is recorded. Your opponent sees your video, you see theirs. The camera
                doesn&apos;t lie — and neither does your score.
              </p>
            </div>

            <div className="mkt-feature mkt-feature--wide">
              <div>
                <div
                  className="mkt-feature__icon"
                  style={{
                    background: 'rgba(255,193,7,0.1)',
                    color: '#ffc107',
                  }}
                  aria-hidden
                >
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M16 6l2.29 2.29-4.88 4.88-4-4L2 16.59 3.41 18l6-6 4 4 6.3-6.29L22 12V6h-6z" />
                  </svg>
                </div>
                <h3 className="mkt-feature__title">Global leaderboard</h3>
                <p className="mkt-feature__body">
                  Every rep counts toward your global ranking. Climb the leaderboard, defend your
                  position, and see exactly where you stand against the world.
                </p>
              </div>
              <div className="mkt-lb">
                {LB_ROWS.map((row) => (
                  <div key={row.rank} className="mkt-lb__row">
                    <span
                      className={
                        row.rank <= 3 ? 'mkt-lb__rank mkt-lb__rank--top' : 'mkt-lb__rank'
                      }
                    >
                      {row.rank}
                    </span>
                    <span className="mkt-lb__ava" aria-hidden />
                    <span className="mkt-lb__name">{row.name}</span>
                    <span className="mkt-lb__score">
                      <span className="mkt-lb__reps">{row.reps}</span>
                      <span className="mkt-lb__delta">{row.delta}</span>
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="mkt-feature">
              <div
                className="mkt-feature__icon"
                style={{
                  background: 'rgba(255,255,255,0.06)',
                  color: 'rgba(255,255,255,0.45)',
                }}
                aria-hidden
              >
                <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5s-3 1.34-3 3 1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5 5 6.34 5 9s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z" />
                </svg>
              </div>
              <h3 className="mkt-feature__title">Challenge anyone</h3>
              <p className="mkt-feature__body">
                Friends, strangers, rivals. Send a challenge link to anyone — they don&apos;t even
                need an account to see your result.
              </p>
            </div>

            <div className="mkt-feature">
              <div
                className="mkt-feature__icon"
                style={{
                  background: 'rgba(255,255,255,0.06)',
                  color: 'rgba(255,255,255,0.45)',
                }}
                aria-hidden
              >
                <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M11.8 10.9c-2.27-.59-3-1.2-3-2.15 0-1.09 1.01-1.85 2.7-1.85 1.78 0 2.44.85 2.5 2.1h2.21c-.07-1.72-1.12-3.3-3.21-3.81V3h-3v2.16c-1.94.42-3.5 1.68-3.5 3.61 0 2.31 1.91 3.46 4.7 4.13 2.5.6 3 1.48 3 2.41 0 .69-.49 1.79-2.7 1.79-2.06 0-2.87-.92-2.98-2.1h-2.2c.12 2.19 1.76 3.42 3.68 3.83V21h3v-2.15c1.95-.37 3.5-1.5 3.5-3.55 0-2.84-2.43-3.81-4.7-4.4z" />
                </svg>
              </div>
              <h3 className="mkt-feature__title">Free to start</h3>
              <p className="mkt-feature__body">
                Solo sessions and sending challenges are always free. Credits only cost when you
                accept an incoming challenge.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="mkt-section mkt-section--alt">
        <div className="mkt-section__inner">
          <p className="mkt-section__tag">From the community</p>
          <h2 className="mkt-section__title">They came for the challenge. They stayed for the addiction.</h2>
          <p className="mkt-section__sub" style={{ marginBottom: 32 }}>
            Real voices from people pushing their limits.
          </p>

          <div className="mkt-testimonials">
            <blockquote className="mkt-quote">
              <p className="mkt-quote__text">
                &ldquo;I&apos;ve done more pushups in the last two weeks than in the past year.
                Having someone to beat changes everything.&rdquo;
              </p>
              <footer className="mkt-quote__author">
                <span
                  className="mkt-quote__avatar"
                  style={{ background: 'rgba(255,87,34,0.25)', color: '#ffab91' }}
                >
                  MR
                </span>
                <div className="mkt-quote__meta">
                  <div className="mkt-quote__name">Marcus R.</div>
                  <div className="mkt-quote__handle">Rank #12 globally</div>
                </div>
              </footer>
            </blockquote>
            <blockquote className="mkt-quote">
              <p className="mkt-quote__text">
                &ldquo;My coworker challenged me on a Monday. By Friday I had done 400 pushups trying
                to catch up. Worth it.&rdquo;
              </p>
              <footer className="mkt-quote__author">
                <span
                  className="mkt-quote__avatar"
                  style={{ background: 'rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.7)' }}
                >
                  SL
                </span>
                <div className="mkt-quote__meta">
                  <div className="mkt-quote__name">Sarah L.</div>
                  <div className="mkt-quote__handle">23W — 4L</div>
                </div>
              </footer>
            </blockquote>
            <blockquote className="mkt-quote">
              <p className="mkt-quote__text">
                &ldquo;The AI counting is genuinely impressive. I&apos;ve tried other apps but this
                is the first one where I actually trust the rep count.&rdquo;
              </p>
              <footer className="mkt-quote__author">
                <span
                  className="mkt-quote__avatar"
                  style={{ background: 'rgba(76,175,80,0.2)', color: '#a5d6a7' }}
                >
                  JT
                </span>
                <div className="mkt-quote__meta">
                  <div className="mkt-quote__name">James T.</div>
                  <div className="mkt-quote__handle">Personal best: 67 reps</div>
                </div>
              </footer>
            </blockquote>
          </div>
        </div>
      </section>

      <section id="pricing" className="mkt-strip mkt-strip--pricing">
        <div className="mkt-strip__card">
          <h2 className="mkt-strip__title">Simple pricing</h2>
          <p className="mkt-strip__body">
            Start free with solo sessions and outgoing challenges. When you accept a head-to-head
            challenge, you use credits — pick a pack anytime. No subscriptions.
          </p>
          <a className="mkt-btn-lg mkt-btn-lg--primary" href={APP_CREDITS_URL}>
            View credit packs
          </a>
        </div>
      </section>

      <section id="about" className="mkt-strip mkt-strip--about">
        <div className="mkt-strip__card">
          <h2 className="mkt-strip__title">About PushupPros</h2>
          <p className="mkt-strip__body">
            We built PushupPros so anyone can compete fairly — AI counting, video proof, and a global
            ladder that actually means something. No gym membership, no excuses.
          </p>
          <Link className="mkt-btn-lg mkt-btn-lg--ghost" to="/how-it-works">
            How it works
          </Link>
        </div>
      </section>

      <section className="mkt-bottom-cta">
        <p className="mkt-section__tag mkt-section__tag--muted">Ready?</p>
        <h2 className="mkt-bottom-cta__title">Your first challenge is one tap away.</h2>
        <p className="mkt-bottom-cta__sub">
          Free to start. No equipment. Just you, the floor, and someone to beat.
        </p>
        <div className="mkt-bottom-cta__ctas">
          <a className="mkt-btn-lg mkt-btn-lg--primary" href={APP_SIGN_UP_URL}>
            Get started free →
          </a>
          <Link className="mkt-btn-lg mkt-btn-lg--ghost" to="/pricing">
            See pricing
          </Link>
        </div>
      </section>
    </>
  )
}
