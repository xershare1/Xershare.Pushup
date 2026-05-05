type Size = 'md' | 'sm'

type Props = {
  size?: Size
  className?: string
  /** For standalone decorative use, omit label so the spinner is aria-hidden */
  'aria-label'?: string
}

export function Spinner({ size = 'md', className = '', 'aria-label': ariaLabel }: Props) {
  const sm = size === 'sm' ? ' app-spinner--sm' : ''
  const decorative = !ariaLabel
  return (
    <div
      className={`app-spinner${sm} ${className}`.trim()}
      aria-hidden={decorative}
      aria-label={ariaLabel}
      role={ariaLabel ? 'img' : undefined}
    />
  )
}
