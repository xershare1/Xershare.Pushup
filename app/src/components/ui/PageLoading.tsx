import { Spinner } from './Spinner'

type Layout = 'page' | 'inline' | 'inlineCol'

type Props = {
  message?: string
  layout?: Layout
  className?: string
  /** Tighter min-height (e.g. root shell before Clerk loads) */
  pageDensity?: 'default' | 'tight'
  /** Extra classes on the status region (e.g. page-specific muted class) */
  messageClassName?: string
  showSpinner?: boolean
}

/**
 * Shared loading state: center column for full-page, row for inline lists.
 * Use role=status for polite announcements; pair with visible message when possible.
 */
export function PageLoading({
  message = 'Loading…',
  layout = 'page',
  className = '',
  pageDensity = 'default',
  messageClassName = 'app-page-loading__msg',
  showSpinner = true,
}: Props) {
  if (layout === 'inline' || layout === 'inlineCol') {
    return (
      <div
        className={
          `app-loading-block${layout === 'inlineCol' ? ' app-loading-block--col' : ''} ${className}`.trim()
        }
        role="status"
        aria-live="polite"
        aria-busy="true"
      >
        {showSpinner ? <Spinner size="sm" /> : null}
        {message ? <span className={messageClassName}>{message}</span> : null}
      </div>
    )
  }

  const density = pageDensity === 'tight' ? ' app-page-loading--tight' : ''
  return (
    <div
      className={`app-page-loading${density} ${className}`.trim()}
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      {showSpinner ? <Spinner /> : null}
      {message ? <p className={messageClassName}>{message}</p> : null}
    </div>
  )
}
