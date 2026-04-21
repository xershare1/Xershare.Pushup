import { useState } from 'react'
import { Link } from 'react-router-dom'

import { APP_SIGN_UP_URL } from '../constants'

import '../styles/how-it-works.css'

const FAQ_ITEMS: { q: string; a: string }[] = [
  {
    q: 'Do I need to download an app?',
    a: "No. PushupPros runs entirely in your browser. On mobile, you can add it to your home screen as a PWA for a native app experience — but there's nothing to download from an app store.",
  },
  {
    q: 'What if I think my opponent cheated?',
    a: "Every rep is backed by video proof. You can watch your opponent's full recording after the challenge completes. The AI applies the same rep-counting standard to both players — partial reps, bounced reps, and non-full-lockout reps are not counted for either side.",
  },
  {
    q: 'What does a credit cost, and what does it get me?',
    a: 'Credits are used when you accept an incoming challenge — 1 credit per challenge accepted. Sending challenges, recording solo sessions, and viewing the leaderboard are all free. Credits start from $5 for 5 credits, down to $0.50 per credit in the best value pack.',
  },
  {
    q: "What if my camera doesn't detect me properly?",
    a: "The readiness check screen before your set tells you exactly what's wrong — body not fully visible, poor lighting, arms not detected, etc. Most issues are fixed by moving your device further back, improving lighting, or wearing more contrasting clothing. The check won't let you start until your position is valid.",
  },
  {
    q: 'How long does my opponent have to respond?',
    a: "48 hours from when the challenge is sent. If they don't respond in time, the challenge expires and you get a notification. You can challenge someone else or send them a reminder directly.",
  },
  {
    q: 'Are my videos stored forever?',
    a: "Videos from solo sessions are stored for 24 hours — you'll see an expiry warning on the Videos page and can download them before they're deleted. Videos from completed challenges are stored for the lifetime of that challenge record so both players can always review the proof.",
  },
]

function DetailList({ items }: { items: string[] }) {
  return (
    <ul className="hiw-flow__details">
      {items.map((t) => (
        <li key={t}>
          <span className="hiw-flow__dot" aria-hidden />
          {t}
        </li>
      ))}
    </ul>
  )
}

export function HowItWorks() {
  const [openFaq, setOpenFaq] = useState<number | null>(null)

  function toggleFaq(i: number) {
    setOpenFaq((prev) => (prev === i ? null : i))
  }

  return (
    <article className="hiw">
      <header className="hiw-hero">
        <span className="hiw-hero__tag">How it works</span>
        <h1 className="hiw-hero__title">Simple rules. Serious competition.</h1>
        <p className="hiw-hero__sub">
          Everything you need to know about how PushupPros works — from your first rep to your
          first win.
        </p>
      </header>

      <section className="hiw-section hiw-section--alt">
        <div className="hiw-section__inner">
          <p className="hiw-section__tag">Before you start</p>
          <h2 className="hiw-section__title">What you need</h2>
          <p className="hiw-section__sub">
            No gym membership. No equipment. No excuses. Just these three things.
          </p>
          <div className="hiw-need__grid">
            <div className="hiw-need__card">
              <div
                className="hiw-need__icon"
                style={{ background: 'rgba(255,87,34,0.1)', color: '#ff5722' }}
                aria-hidden
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M17 1.01L7 1c-1.1 0-2 .9-2 2v18c0 1.1.9 2 2 2h10c1.1 0 2-.9 2-2V3c0-1.1-.9-1.99-2-1.99zM17 19H7V5h10v14z" />
                </svg>
              </div>
              <div>
                <h3 className="hiw-need__title">A phone or laptop</h3>
                <p className="hiw-need__body">
                  Any device with a front-facing camera works. No app download required — it runs
                  in your browser.
                </p>
              </div>
            </div>
            <div className="hiw-need__card">
              <div
                className="hiw-need__icon"
                style={{
                  background: 'rgba(255,255,255,0.06)',
                  color: 'rgba(255,255,255,0.45)',
                }}
                aria-hidden
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M4 10v11h16V10H4zm2 9H6v-7h12v7h-2v-5H8v5zm11-9H7V6h10v4z" />
                </svg>
              </div>
              <div>
                <h3 className="hiw-need__title">Floor space</h3>
                <p className="hiw-need__body">
                  About 6 feet of clear space in front of your camera. Enough for your full body to
                  be in frame.
                </p>
              </div>
            </div>
            <div className="hiw-need__card">
              <div
                className="hiw-need__icon"
                style={{ background: 'rgba(76,175,80,0.1)', color: '#4caf50' }}
                aria-hidden
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5s-3 1.34-3 3 1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5 5 6.34 5 9s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5z" />
                </svg>
              </div>
              <div>
                <h3 className="hiw-need__title">Someone to beat</h3>
                <p className="hiw-need__body">
                  A friend, a coworker, a stranger on the leaderboard. Anyone with a pulse and
                  some pushups in them.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="hiw-section hiw-section--base">
        <div className="hiw-section__inner">
          <p className="hiw-section__tag">The flow</p>
          <h2 className="hiw-section__title">How a challenge works, step by step</h2>

          <div className="hiw-flow">
            <div className="hiw-flow__step">
              <div className="hiw-flow__rail">
                <span className="hiw-flow__num">1</span>
                <span className="hiw-flow__connector" aria-hidden />
              </div>
              <div className="hiw-flow__copy">
                <p className="hiw-flow__label">Step one</p>
                <h3 className="hiw-flow__heading">Record your set</h3>
                <p className="hiw-flow__body">
                  Position your device so your full body is visible. Get into a plank position — our
                  AI checks your pose and gives you the green light. Then the countdown starts.
                </p>
                <DetailList
                  items={[
                    'AI verifies your starting position before counting begins',
                    '60 second maximum — go until time runs out or you can\'t go anymore',
                    'Every rep is counted automatically. No manual input.',
                    'Your video is recorded as proof',
                  ]}
                />
              </div>
              <div className="hiw-flow__visual">
                <div className="hiw-mock-hud__cam">
                  <div className="hiw-mock-hud__badge">
                    <span className="hiw-mock-hud__pulse" aria-hidden />
                    Recording
                  </div>
                  <div className="hiw-mock-hud__timer">0:38</div>
                  <div className="hiw-mock-hud__count-wrap">
                    <div className="hiw-mock-hud__count">14</div>
                    <div className="hiw-mock-hud__count-label">reps</div>
                  </div>
                </div>
                <div className="hiw-mock-hud__motion">
                  <div className="hiw-mock-hud__motion-label">Motion</div>
                  <div className="hiw-mock-hud__motion-bar">
                    <div className="hiw-mock-hud__motion-fill" />
                  </div>
                </div>
              </div>
            </div>

            <div className="hiw-flow__step">
              <div className="hiw-flow__rail">
                <span className="hiw-flow__num">2</span>
                <span className="hiw-flow__connector" aria-hidden />
              </div>
              <div className="hiw-flow__copy">
                <p className="hiw-flow__label">Step two</p>
                <h3 className="hiw-flow__heading">Send the challenge</h3>
                <p className="hiw-flow__body">
                  Once your set is saved, challenge anyone — a friend by name, or anyone on the
                  global leaderboard. They&apos;ll see your rep count and your video. Now it&apos;s
                  their turn.
                </p>
                <DetailList
                  items={[
                    'Challenge by display name or share a link directly',
                    'Your opponent sees your video before they record theirs',
                    'Sending a challenge is always free — 1 credit to accept one',
                    'They have 48 hours to respond before the challenge expires',
                  ]}
                />
              </div>
              <div className="hiw-flow__visual">
                <div className="hiw-mock-send">
                  <p className="hiw-mock-send__label">Your result</p>
                  <div className="hiw-mock-send__result">
                    <span className="hiw-mock-send__score">42</span>
                    <div className="hiw-mock-send__meta">
                      reps · Apr 19, 2026
                      <br />
                      best set this week
                    </div>
                    <span className="hiw-mock-send__pb">PB</span>
                  </div>
                  <p className="hiw-mock-send__label">Send to</p>
                  <div className="hiw-mock-send__actions">
                    <div className="hiw-mock-send__btn hiw-mock-send__btn--primary">
                      Challenge pushuppro22 →
                    </div>
                    <div className="hiw-mock-send__btn hiw-mock-send__btn--ghost">
                      + Challenge someone else
                    </div>
                    <div className="hiw-mock-send__btn hiw-mock-send__btn--ghost">✓ Copy challenge link</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="hiw-flow__step">
              <div className="hiw-flow__rail">
                <span className="hiw-flow__num">3</span>
                <span className="hiw-flow__connector" aria-hidden />
              </div>
              <div className="hiw-flow__copy">
                <p className="hiw-flow__label">Step three</p>
                <h3 className="hiw-flow__heading">They record. You both find out.</h3>
                <p className="hiw-flow__body">
                  Your opponent records their set under the same rules — 60 seconds, AI counting,
                  video proof. When they&apos;re done, the result is instant. Winner takes the rep
                  count bragging rights.
                </p>
                <DetailList
                  items={[
                    'Both videos are saved and visible to both players',
                    'Results update your global ranking automatically',
                    'Rematch instantly or challenge someone new',
                    'Share your result to social — win or lose',
                  ]}
                />
              </div>
              <div className="hiw-flow__visual">
                <div className="hiw-mock-result">
                  <div className="hiw-mock-result__label">Result</div>
                  <div className="hiw-mock-result__winner">pushuppro22 wins</div>
                  <div className="hiw-mock-result__scores">
                    <div className="hiw-mock-result__block">
                      <div className="hiw-mock-result__val hiw-mock-result__val--lose">38</div>
                      <div className="hiw-mock-result__name">You</div>
                    </div>
                    <span className="hiw-mock-result__vs">vs</span>
                    <div className="hiw-mock-result__block">
                      <div className="hiw-mock-result__val hiw-mock-result__val--win">42</div>
                      <div className="hiw-mock-result__name">pushuppro22</div>
                    </div>
                  </div>
                  <div className="hiw-mock-result__actions">
                    <button type="button" className="hiw-mock-result__btn hiw-mock-result__btn--ghost">
                      Rematch
                    </button>
                    <button type="button" className="hiw-mock-result__btn hiw-mock-result__btn--ghost">
                      Share result
                    </button>
                    <button type="button" className="hiw-mock-result__btn hiw-mock-result__btn--primary">
                      New challenge
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div className="hiw-flow__step hiw-flow__step--last">
              <div className="hiw-flow__rail">
                <span className="hiw-flow__num">4</span>
                <span className="hiw-flow__connector" aria-hidden />
              </div>
              <div className="hiw-flow__copy">
                <p className="hiw-flow__label">And then</p>
                <h3 className="hiw-flow__heading">Climb. Repeat. Become a legend.</h3>
                <p className="hiw-flow__body">
                  Every challenge adds to your record. Every rep counts toward your global ranking.
                  The leaderboard is public — so is your win/loss record. There&apos;s nowhere to
                  hide.
                </p>
                <DetailList
                  items={[
                    'Global ranking updates after every completed challenge',
                    'Your full stats and history are tracked on your Stats page',
                    'Solo sessions count toward your total rep tally and personal best',
                    'The top 100 on the leaderboard are publicly visible to anyone',
                  ]}
                />
              </div>
              <div className="hiw-flow__visual">
                <div className="hiw-mock-progress">
                  <div className="hiw-mock-progress__label">Your progress</div>
                  <div className="hiw-mock-progress__grid">
                    <div className="hiw-mock-progress__cell hiw-mock-progress__cell--orange">
                      <div className="hiw-mock-progress__val hiw-mock-progress__val--orange">+8</div>
                      <div className="hiw-mock-progress__cap">rank positions</div>
                    </div>
                    <div className="hiw-mock-progress__cell">
                      <div className="hiw-mock-progress__val">#42</div>
                      <div className="hiw-mock-progress__cap">global rank</div>
                    </div>
                    <div className="hiw-mock-progress__cell">
                      <div className="hiw-mock-progress__val">67%</div>
                      <div className="hiw-mock-progress__cap">win rate</div>
                    </div>
                    <div className="hiw-mock-progress__cell">
                      <div className="hiw-mock-progress__val hiw-mock-progress__val--green">30</div>
                      <div className="hiw-mock-progress__cap">personal best</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="hiw-section hiw-section--alt">
        <div className="hiw-section__inner">
          <p className="hiw-section__tag">Under the hood</p>
          <h2 className="hiw-section__title">How the AI counting works</h2>
          <p className="hiw-section__sub">
            No manual counting. No honor system. Just computer vision running at 30 frames per
            second.
          </p>

          <div className="hiw-ai__grid">
            <div className="hiw-ai__card">
              <div className="hiw-ai__stat">30fps</div>
              <h3 className="hiw-ai__label">Pose estimation speed</h3>
              <p className="hiw-ai__body">
                Your camera feed is analyzed 30 times per second. Key body landmarks — shoulders,
                elbows, wrists, hips — are tracked continuously throughout your set.
              </p>
            </div>
            <div className="hiw-ai__card">
              <div className="hiw-ai__stat">14</div>
              <h3 className="hiw-ai__label">Body points tracked</h3>
              <p className="hiw-ai__body">
                Shoulders, elbows, wrists, hips, knees and more. The system understands your full
                body position — not just arm movement.
              </p>
            </div>
            <div className="hiw-ai__card">
              <div className="hiw-ai__stat">99ms</div>
              <h3 className="hiw-ai__label">Detection latency</h3>
              <p className="hiw-ai__body">
                Reps are counted the instant you complete them — before you even start coming back
                up. The counter updates in under a tenth of a second.
              </p>
            </div>
            <div className="hiw-ai__card">
              <div className="hiw-ai__stat">100%</div>
              <h3 className="hiw-ai__label">On-device processing</h3>
              <p className="hiw-ai__body">
                All pose estimation runs locally on your device. Your video is never sent to a
                server for counting — only the final recording is uploaded when your set ends.
              </p>
            </div>
            <div className="hiw-ai__card hiw-ai__card--wide">
              <h3 className="hiw-ai__label">What counts as a valid rep?</h3>
              <p className="hiw-ai__body">
                A rep is counted when: your elbows reach approximately 90 degrees on the way down,
                and you return to a full lockout position at the top. The system checks both phases —
                partial reps don&apos;t count. This is the same standard used in most fitness
                competitions and is enforced automatically, consistently, for every user.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="hiw-section hiw-section--base">
        <div className="hiw-section__inner">
          <p className="hiw-section__tag">Common questions</p>
          <h2 className="hiw-section__title">Things people ask</h2>

          <div className="hiw-faq">
            {FAQ_ITEMS.map((item, i) => {
              const open = openFaq === i
              return (
                <div
                  key={item.q}
                  className={`hiw-faq__item ${open ? 'hiw-faq__item--open' : ''}`}
                >
                  <button
                    type="button"
                    className="hiw-faq__trigger"
                    aria-expanded={open}
                    onClick={() => toggleFaq(i)}
                  >
                    {item.q}
                    <span className="hiw-faq__chevron" aria-hidden>
                      ›
                    </span>
                  </button>
                  <p className="hiw-faq__answer" hidden={!open}>
                    {item.a}
                  </p>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      <section className="hiw-cta">
        <h2 className="hiw-cta__title">Ready to find out where you rank?</h2>
        <p className="hiw-cta__sub">Free to start. Your first solo session takes less than 2 minutes.</p>
        <div className="hiw-cta__btns">
          <a className="hiw-btn hiw-btn--primary" href={APP_SIGN_UP_URL}>
            Get started free →
          </a>
          <Link className="hiw-btn hiw-btn--ghost" to="/pricing">
            See pricing
          </Link>
        </div>
      </section>
    </article>
  )
}
