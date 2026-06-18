import { useEffect, type ReactNode } from 'react'

export function BottomSheet({
  open,
  onClose,
  children,
}: {
  open: boolean
  onClose: () => void
  children: ReactNode
}) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onClose])

  return (
    <div
      className={`app-sheet${open ? ' app-sheet--open' : ''}`}
      aria-hidden={!open}
      onClick={onClose}
    >
      <div
        className="app-sheet__panel"
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="app-sheet__handle" aria-hidden />
        {children}
      </div>
    </div>
  )
}
