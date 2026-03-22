import type { ReactNode } from 'react'
import { CHALLENGE_APP_URL } from '../constants'

type PushupGuideLayoutProps = {
  title: string
  children: ReactNode
}

export function PushupGuideLayout({ title, children }: PushupGuideLayoutProps) {
  return (
    <article className="page guide-page">
      <h1 className="page-title">{title}</h1>
      <div className="prose">{children}</div>
      <section className="guide-cta" aria-label="Call to action">
        <a
          className="btn btn-primary"
          href={CHALLENGE_APP_URL}
          target="_blank"
          rel="noopener noreferrer"
        >
          Start a Pushup Challenge
        </a>
      </section>
    </article>
  )
}
