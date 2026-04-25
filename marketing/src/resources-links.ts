/**
 * Resources menu items — shared by desktop dropdown and mobile nav.
 */
export type ResourceSection = 'guides' | 'learn'

export type ResourceLinkItem = {
  to: string
  title: string
  sub: string
}

export const RESOURCE_GUIDES: ResourceLinkItem[] = [
  {
    to: '/guides/pushup-form',
    title: 'Pushup form',
    sub: 'Perfect your technique before you compete',
  },
  {
    to: '/guides/pushup-variations',
    title: 'Variations',
    sub: 'Wide grip, diamond, decline and more',
  },
  {
    to: '/guides/training-tips',
    title: 'Training tips',
    sub: 'Build consistency and increase your max',
  },
]

export const RESOURCE_LEARN: ResourceLinkItem[] = [
  {
    to: '/learn/history',
    title: 'History of the pushup',
    sub: 'From ancient training to AI rep counting',
  },
  {
    to: '/learn/world-records',
    title: 'World records',
    sub: 'How does your best stack up?',
  },
]
