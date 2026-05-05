import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react'
import type { FriendOut } from '../../../api/friends'
import { Spinner } from '../../ui/Spinner'
import './friend-picker.css'

function initialsForFriend(f: FriendOut): string {
  const n = (f.displayName || '').trim() || f.clerkUserId
  const words = n.split(/\s+/).filter(Boolean)
  if (words.length >= 2) {
    return (words[0]![0]! + words[1]![0]!).toUpperCase()
  }
  if (n.length >= 2) return n.slice(0, 2).toUpperCase()
  return n.slice(0, 1).toUpperCase() || '?'
}

type Props = {
  id?: string
  friends: FriendOut[]
  value: string
  onChange: (clerkUserId: string) => void
  disabled?: boolean
  loading?: boolean
  label?: string
}

const Chevron = () => (
  <svg className="friend-picker__chev" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
    <path d="M5.2 7.2a.75.75 0 0 1 1.1 0L10 10.8l3.7-3.6a.75.75 0 0 1 1 1.1l-4.2 4.1a.75.75 0 0 1-1.1 0L5.2 8.3a.75.75 0 0 1 0-1.1Z" />
  </svg>
)

export function FriendPicker({
  id,
  friends,
  value,
  onChange,
  disabled = false,
  loading = false,
  label = 'Pick from your friends',
}: Props) {
  const baseId = useId()
  const listId = id ?? `friend-picker-${baseId}`
  const searchId = `${listId}-search`
  const [open, setOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const wrapRef = useRef<HTMLDivElement>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)

  const selected = friends.find((f) => f.clerkUserId === value)
  const isBusy = Boolean(disabled || loading)
  const showPlaceholder = !selected

  const filteredFriends = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    if (!q) return friends
    return friends.filter((f) => {
      const name = (f.displayName || '').toLowerCase()
      const sid = (f.clerkUserId || '').toLowerCase()
      return name.includes(q) || sid.includes(q)
    })
  }, [friends, searchQuery])

  const close = useCallback(() => {
    setSearchQuery('')
    setOpen(false)
  }, [])

  useEffect(() => {
    if (open && !loading) {
      requestAnimationFrame(() => searchInputRef.current?.focus())
    }
  }, [open, loading])

  useEffect(() => {
    if (!open) return
    const onDoc = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) close()
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close()
    }
    document.addEventListener('mousedown', onDoc)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDoc)
      document.removeEventListener('keydown', onKey)
    }
  }, [open, close])

  return (
    <div className="friend-picker" ref={wrapRef}>
      <span className="friend-picker__label" id={`${listId}-label`}>
        {label}
      </span>
      <button
        type="button"
        className="friend-picker__trigger"
        id={listId}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-labelledby={`${listId}-label`}
        aria-controls={`${listId}-listbox`}
        disabled={isBusy}
        onClick={() => {
          if (isBusy) return
          if (open) close()
          else setOpen(true)
        }}
      >
        <div className="friend-picker__trigger-inner">
          {loading ? (
            <>
              <div className="friend-picker__avatar friend-picker__avatar--placeholder" aria-hidden>
                <Spinner size="sm" />
              </div>
              <span className="friend-picker__name friend-picker__name--placeholder">Loading friends…</span>
            </>
          ) : showPlaceholder ? (
            <>
              <div className="friend-picker__avatar friend-picker__avatar--placeholder">+</div>
              <span className="friend-picker__name friend-picker__name--placeholder">Choose a friend</span>
            </>
          ) : (
            <>
              <div className="friend-picker__avatar" aria-hidden>
                {initialsForFriend(selected!)}
              </div>
              <span className="friend-picker__name">
                {selected!.displayName?.trim() || 'Friend'}
              </span>
            </>
          )}
        </div>
        <Chevron />
      </button>

      {open && !loading && friends.length > 0 ? (
        <div className="friend-picker__panel" id={`${listId}-panel`}>
          <div className="friend-picker__search-wrap">
            <input
              ref={searchInputRef}
              id={searchId}
              type="search"
              className="friend-picker__search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by name…"
              aria-label="Filter friends"
              autoComplete="off"
              onKeyDown={(e) => e.stopPropagation()}
            />
          </div>
          <div
            className="friend-picker__list-scroll"
            id={`${listId}-listbox`}
            role="listbox"
            aria-labelledby={`${listId}-label`}
            aria-label="Friend list"
          >
            {filteredFriends.length > 0 ? (
              filteredFriends.map((f) => {
                const active = f.clerkUserId === value
                return (
                  <button
                    key={f.clerkUserId}
                    type="button"
                    role="option"
                    aria-selected={active}
                    className={`friend-picker__option${active ? ' friend-picker__option--active' : ''}`}
                    onClick={() => {
                      onChange(f.clerkUserId)
                      close()
                    }}
                  >
                    <div className="friend-picker__avatar" aria-hidden>
                      {initialsForFriend(f)}
                    </div>
                    <div className="friend-picker__list-name">
                      {f.displayName?.trim() || 'Friend'}
                    </div>
                  </button>
                )
              })
            ) : (
              <p className="friend-picker__no-matches">No matches. Try a different name.</p>
            )}
          </div>
        </div>
      ) : null}

      {open && !loading && friends.length === 0 ? (
        <div className="friend-picker__panel" id={`${listId}-listbox`}>
          <p className="friend-picker__empty">No friends yet.</p>
        </div>
      ) : null}
    </div>
  )
}
