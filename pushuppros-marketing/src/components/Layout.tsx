import type { ReactNode } from 'react'
import { Nav } from './Nav'

type LayoutProps = {
  children: ReactNode
}

export function Layout({ children }: LayoutProps) {
  return (
    <div className="layout">
      <Nav />
      <main className="main">{children}</main>
      <footer className="footer">
        <p className="footer-note">PushupPros — social pushup challenges</p>
      </footer>
    </div>
  )
}
