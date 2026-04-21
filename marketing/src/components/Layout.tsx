import type { ReactNode } from 'react'

import { Footer } from './Footer'
import { Nav } from './Nav'

type LayoutProps = {
  children: ReactNode
}

export function Layout({ children }: LayoutProps) {
  return (
    <div className="mkt-layout">
      <Nav />
      <main className="mkt-main">{children}</main>
      <Footer />
    </div>
  )
}
