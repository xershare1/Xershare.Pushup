import { Link } from 'react-router-dom'

import { APP_SIGN_UP_URL, CONTACT_MAILTO } from '../constants'

export function Footer() {
  return (
    <footer className="mkt-footer">
      <div className="mkt-footer__grid">
        <div className="mkt-footer__brand">
          <Link to="/" className="mkt-footer__brand-logo">
            <span className="mkt-footer__brand-pushup">Pushup</span>
            <span className="mkt-footer__brand-accent">Pros</span>
          </Link>
          <p className="mkt-footer__tagline">
            Working out is better when there&apos;s someone to beat. Free to start. No equipment
            needed.
          </p>
        </div>

        <div>
          <div className="mkt-footer__col-title">Product</div>
          <Link className="mkt-footer__col-link" to="/how-it-works">
            How it works
          </Link>
          <Link className="mkt-footer__col-link" to="/pricing">
            Pricing
          </Link>
          <Link className="mkt-footer__col-link" to="/about">
            About
          </Link>
          <a className="mkt-footer__col-link" href={APP_SIGN_UP_URL}>
            Sign up
          </a>
        </div>

        <div>
          <div className="mkt-footer__col-title">Guides</div>
          <Link className="mkt-footer__col-link" to="/guides/pushup-form">
            Pushup form
          </Link>
          <Link className="mkt-footer__col-link" to="/guides/pushup-variations">
            Variations
          </Link>
          <Link className="mkt-footer__col-link" to="/guides/training-tips">
            Training tips
          </Link>
          <Link className="mkt-footer__col-link" to="/learn/history">
            History of the pushup
          </Link>
          <Link className="mkt-footer__col-link" to="/learn/world-records">
            World records
          </Link>
        </div>

        <div>
          <div className="mkt-footer__col-title">Company</div>
          <Link className="mkt-footer__col-link" to="/about">
            About
          </Link>
          <Link className="mkt-footer__col-link" to="/privacy">
            Privacy policy
          </Link>
          <Link className="mkt-footer__col-link" to="/terms">
            Terms of service
          </Link>
          <a className="mkt-footer__col-link" href={CONTACT_MAILTO}>
            Contact
          </a>
        </div>
      </div>

      <div className="mkt-footer__bottom">
        <Link to="/" className="mkt-footer__bottom-logo">
          <span className="mkt-footer__brand-pushup">Pushup</span>
          <span className="mkt-footer__brand-accent">Pros</span>
        </Link>
        <div className="mkt-footer__bottom-center">
          <Link to="/privacy">Privacy</Link>
          <Link to="/terms">Terms</Link>
        </div>
        <p className="mkt-footer__bottom-copy">© 2026 PushupPros. All rights reserved.</p>
      </div>
    </footer>
  )
}
