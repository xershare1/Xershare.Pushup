/**
 * Resources menu items — shared by desktop dropdown and mobile nav.
 */
export type ResourceSection = 'guides' | 'learn'

export type ResourceLinkItem = {
  to: string
  title: string
  sub: string
  iconVariant: 'accent' | 'muted'
}

export const RESOURCE_GUIDES: ResourceLinkItem[] = [
  {
    to: '/guides/pushup-form',
    title: 'Pushup form',
    sub: 'Perfect your technique before you compete',
    iconVariant: 'accent',
  },
  {
    to: '/guides/pushup-variations',
    title: 'Variations',
    sub: 'Wide grip, diamond, decline and more',
    iconVariant: 'muted',
  },
  {
    to: '/guides/training-tips',
    title: 'Training tips',
    sub: 'Build consistency and increase your max',
    iconVariant: 'muted',
  },
]

export const RESOURCE_LEARN: ResourceLinkItem[] = [
  {
    to: '/pushups/history',
    title: 'History of the pushup',
    sub: 'From ancient training to AI rep counting',
    iconVariant: 'muted',
  },
  {
    to: '/pushups/records',
    title: 'World records',
    sub: 'How does your best stack up?',
    iconVariant: 'muted',
  },
]
