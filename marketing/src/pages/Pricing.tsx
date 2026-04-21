import { useState } from 'react'
import { Link } from 'react-router-dom'

import { APP_SIGN_UP_URL } from '../constants'

import '../styles/pricing.css'

const PACKS = [
  {
    id: 'starter',
    name: 'Starter',
    credits: 5,
    price: '$5',
    perCredit: '$1.00/credit',
    savings: null as string | null,
    perks: ['5 challenge accepts', 'No expiry', 'Instant top-up'],
    featured: false,
  },
  {
    id: 'pro',
    name: 'Pro',
    credits: 15,
    price: '$10',
    perCredit: '$0.67/credit',
    savings: 'Save 33%',
    perks: ['15 challenge accepts', 'No expiry', 'Instant top-up', 'Best seller'],
    featured: true,
  },
  {
    id: 'best',
    name: 'Best value',
    credits: 40,
    price: '$20',
    perCredit: '$0.50/credit',
    savings: 'Save 50%',
    perks: ['40 challenge accepts', 'No expiry', 'Instant top-up', 'Best price per credit'],
    featured: false,
  },
] as const

const TABLE_ROWS = [
  { pack: 'Starter', credits: '5', price: '$5', perCredit: '$1.00', featured: false, highlightPer: false },
  { pack: 'Pro', credits: '15', price: '$10', perCredit: '$0.67', featured: true, highlightPer: true },
  {
    pack: 'Best value',
    credits: '40',
    price: '$20',
    perCredit: '$0.50',
    featured: false,
    highlightPer: true,
  },
] as const

const PRICING_FAQ: { q: string; a: string }[] = [
  {
    q: 'Do I need credits to use the app?',
    a: 'No. Solo sessions, sending challenges, and viewing the leaderboard are all free. You only need credits when you want to accept an incoming challenge from another user.',
  },
  {
    q: 'What happens if I run out of credits?',
    a: "You can still use everything else — solo sessions, sending challenges, and viewing your stats. You just won't be able to accept incoming challenges until you top up. You'll get a notification when a challenge comes in so you can decide whether to top up and accept.",
  },
  {
    q: 'Can I get a refund on unused credits?',
    a: "Credits are non-refundable once purchased, but they never expire — so there's no rush to use them. We recommend starting with the Starter pack if you're unsure how often you'll compete.",
  },
  {
    q: 'Is there a free trial?',
    a: 'Yes — in a way. All new accounts receive a welcome credit bonus so you can accept your first challenge without buying anything. After that, credits are required to keep accepting challenges.',
  },
  {
    q: 'Will you add subscriptions in the future?',
    a: 'Not planned. We believe credits are the right model for this kind of platform — you pay for what you use, not a flat monthly fee whether you compete or not.',
  },
]

const RULE_CARDS = [
  {
    key: 'one',
    icon: 'orange' as const,
    title: '1 credit = 1 accepted challenge',
    body:
      "When someone challenges you and you accept, 1 credit is deducted. That's the only time credits are used.",
  },
  {
    key: 'free',
    icon: 'green' as const,
    title: 'Free to send, free to train',
    body:
      'Issuing challenges to others costs nothing. Solo sessions and personal bests are completely free — always.',
  },
  {
    key: 'expire',
    icon: 'muted' as const,
    title: 'Credits never expire',
    body:
      "Buy once, use whenever. There's no time limit, no monthly reset, and no subscription to manage.",
  },
]

function GreenCheckIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"
        fill="currentColor"
      />
    </svg>
  )
}

function TrustIcon({ name }: { name: string }) {
  switch (name) {
    case 'stripe':
      return (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z" />
        </svg>
      )
    case 'sub':
      return (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" />
        </svg>
      )
    case 'clock':
      return (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
          <path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z" />
        </svg>
      )
    case 'bolt':
      return (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
          <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
        </svg>
      )
    case 'fee':
      return (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
          <path d="M11.8 10.9c-2.27-.59-3-1.2-3-2.15 0-1.09 1.01-1.85 2.7-1.85 1.78 0 2.44.85 2.5 2.1h2.21c-.07-1.72-1.12-3.3-3.21-3.81V3h-3v2.16c-1.94.42-3.5 1.68-3.5 3.61 0 2.31 1.91 3.46 4.7 4.13 2.5.6 3 1.48 3 2.41 0 .69-.49 1.79-2.7 1.79-2.06 0-2.87-.92-2.98-2.1h-2.2c.12 2.19 1.76 3.42 3.68 3.83V21h3v-2.15c1.95-.37 3.5-1.5 3.5-3.55 0-2.84-2.43-3.81-4.7-4.4z" />
        </svg>
      )
    default:
      return null
  }
}

const TRUST_ITEMS: { label: string; icon: string }[] = [
  { label: 'Secured by Stripe', icon: 'stripe' },
  { label: 'No subscriptions — ever', icon: 'sub' },
  { label: 'Credits never expire', icon: 'clock' },
  { label: 'Instant top-up', icon: 'bolt' },
  { label: 'No hidden fees', icon: 'fee' },
]

export function Pricing() {
  const [openFaq, setOpenFaq] = useState<number | null>(null)

  function toggleFaq(i: number) {
    setOpenFaq((prev) => (prev === i ? null : i))
  }

  return (
    <article className="prc">
      <header className="prc-hero">
        <span className="prc-hero__tag">Pricing</span>
        <h1 className="prc-hero__title">
          Free to start. <em>Pay only to compete.</em>
        </h1>
        <p className="prc-hero__sub">
          Solo sessions, personal records, and sending challenges are always free. Credits are only
          used when you accept a head-to-head challenge.
        </p>
      </header>

      <div className="prc-free">
        <div className="prc-free__icon" aria-hidden>
          <GreenCheckIcon />
        </div>
        <div className="prc-free__copy">
          <p className="prc-free__title">Always free — no credit card required to start</p>
          <p className="prc-free__sub">
            Create an account and start training immediately. Credits only come into play when you
            want to accept a challenge from someone else.
          </p>
        </div>
        <div className="prc-free__pills">
          {['Solo sessions', 'Send challenges', 'Personal records'].map((label) => (
            <div key={label} className="prc-free__pill">
              <span className="prc-free__check" aria-hidden>
                <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" />
                </svg>
              </span>
              {label}
            </div>
          ))}
        </div>
      </div>

      <section className="prc-packs" aria-labelledby="prc-packs-heading">
        <p className="prc-section__eyebrow">Credit packs</p>
        <h2 id="prc-packs-heading" className="prc-section__title">
          Top up when you&apos;re ready to compete
        </h2>
        <p className="prc-section__sub">
          One-time purchases. No subscriptions. Credits never expire.
        </p>

        <div className="prc-packs__grid">
          {PACKS.map((pack) => (
            <div
              key={pack.id}
              className={`prc-pack ${pack.featured ? 'prc-pack--featured' : ''}`}
            >
              {pack.featured && <span className="prc-pack__badge">Most popular</span>}
              <div className="prc-pack__name">{pack.name}</div>
              <p className="prc-pack__count">{pack.credits}</p>
              <div className="prc-pack__credits-label">credits</div>
              <div className="prc-pack__price">{pack.price}</div>
              <p className="prc-pack__per">
                {pack.perCredit}
                {pack.savings ? ` · ${pack.savings}` : ''}
              </p>
              <div className="prc-pack__divider" aria-hidden />
              <ul className="prc-pack__perks">
                {pack.perks.map((p) => (
                  <li key={p}>
                    <span className="prc-pack__dot" aria-hidden />
                    {p}
                  </li>
                ))}
              </ul>
              <a
                className={`prc-pack__cta ${pack.featured ? 'prc-pack__cta--primary' : 'prc-pack__cta--ghost'}`}
                href={APP_SIGN_UP_URL}
              >
                Get started →
              </a>
              <p className="prc-pack__note">Create account to purchase</p>
            </div>
          ))}
        </div>
      </section>

      <section className="prc-table-wrap" aria-labelledby="prc-table-heading">
        <h2 id="prc-table-heading" className="prc-table__title">
          Value breakdown
        </h2>
        <table className="prc-table">
          <thead>
            <tr className="prc-table__head">
              <th scope="col">Pack</th>
              <th scope="col">Credits</th>
              <th scope="col">Price</th>
              <th scope="col">Per credit</th>
            </tr>
          </thead>
          <tbody>
            {TABLE_ROWS.map((row) => (
              <tr
                key={row.pack}
                className={`prc-table__row ${row.featured ? 'prc-table__row--featured' : ''}`}
              >
                <td className="prc-table__pack">
                  {row.pack}
                  {row.featured && <span className="prc-table__popular">Popular</span>}
                </td>
                <td className="prc-table__cell">{row.credits}</td>
                <td className="prc-table__cell">{row.price}</td>
                <td
                  className={`prc-table__cell ${row.highlightPer ? 'prc-table__cell--accent' : ''}`}
                >
                  {row.perCredit}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="prc-rules" aria-labelledby="prc-rules-heading">
        <p className="prc-section__eyebrow">How credits work</p>
        <h2 id="prc-rules-heading" className="prc-section__title">
          Simple rules. No surprises.
        </h2>

        <div className="prc-rules__grid">
          {RULE_CARDS.map((card) => (
            <div key={card.key} className="prc-rule-card">
              <div
                className={`prc-rule-card__icon prc-rule-card__icon--${card.icon}`}
                aria-hidden
              >
                {card.icon === 'orange' && (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
                  </svg>
                )}
                {card.icon === 'green' && (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" />
                  </svg>
                )}
                {card.icon === 'muted' && (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M18.6 6.62c-1.44 0-2.8.56-3.77 1.53L12 10.66 9.17 8.15C8.2 7.18 6.84 6.62 5.4 6.62 2.42 6.62 0 9.04 0 12s2.42 5.38 5.4 5.38c1.44 0 2.8-.56 3.77-1.53l2.83-2.51 2.83 2.51c.97.97 2.33 1.53 3.77 1.53 2.98 0 5.4-2.41 5.4-5.38s-2.42-5.38-5.4-5.38z" />
                  </svg>
                )}
              </div>
              <h3 className="prc-rule-card__title">{card.title}</h3>
              <p className="prc-rule-card__body">{card.body}</p>
            </div>
          ))}
        </div>
      </section>

      <div className="prc-trust" role="list">
        {TRUST_ITEMS.map((item) => (
          <div key={item.label} className="prc-trust__item" role="listitem">
            <TrustIcon name={item.icon} />
            {item.label}
          </div>
        ))}
      </div>

      <section className="prc-faq-section" aria-labelledby="prc-faq-heading">
        <div className="prc-faq__inner">
          <h2 id="prc-faq-heading" className="prc-faq__title">
            Pricing questions
          </h2>
          <div className="prc-faq">
            {PRICING_FAQ.map((item, i) => {
              const open = openFaq === i
              return (
                <div
                  key={item.q}
                  className={`prc-faq__item ${open ? 'prc-faq__item--open' : ''}`}
                >
                  <button
                    type="button"
                    className="prc-faq__trigger"
                    aria-expanded={open}
                    onClick={() => toggleFaq(i)}
                  >
                    {item.q}
                    <span className="prc-faq__chevron" aria-hidden>
                      ›
                    </span>
                  </button>
                  <p className="prc-faq__answer" hidden={!open}>
                    {item.a}
                  </p>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      <section className="prc-bottom" aria-labelledby="prc-bottom-heading">
        <h2 id="prc-bottom-heading" className="prc-bottom__title">
          Start free. <em>Buy when you&apos;re ready.</em>
        </h2>
        <p className="prc-bottom__sub">
          No credit card required to create an account. Top up credits whenever you want to compete.
        </p>
        <div className="prc-bottom__btns">
          <a className="mkt-btn-lg mkt-btn-lg--primary" href={APP_SIGN_UP_URL}>
            Create free account →
          </a>
          <Link className="mkt-btn-lg mkt-btn-lg--ghost" to="/how-it-works">
            How it works
          </Link>
        </div>
      </section>
    </article>
  )
}
