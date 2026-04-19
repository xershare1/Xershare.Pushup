import { useAuth } from '@clerk/react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import {
  acceptFriendInvitation,
  blockUser,
  cancelFriendInvitation,
  declineFriendInvitation,
  fetchBlockedUsers,
  fetchFriendInvitations,
  fetchFriends,
  removeFriend,
  sendFriendInvitation,
  unblockUser,
  type BlockedUserOut,
  type FriendInvitationOut,
  type FriendOut,
} from '../api/friends'
import { lookupUserByDisplayName } from '../api/users'
import { formatError } from '../lib/formatError'
import { formatOutgoingInvitationMeta, formatSentRelative } from '../lib/formatRelativeSent'

type TabId = 0 | 1 | 2

function initialsForFriend(f: FriendOut): string {
  const hint = f.initialsHint?.trim()
  if (hint) return hint
  const name = f.displayName?.trim() || f.clerkUserId
  const parts = name.split(/[\s_]+/).filter(Boolean)
  if (parts.length >= 2) {
    return (parts[0]![0]! + parts[1]![0]!).toUpperCase()
  }
  return name.slice(0, 2).toUpperCase()
}

function initialsFromName(displayName: string | null, fallbackId: string): string {
  const name = displayName?.trim() || fallbackId
  const parts = name.split(/[\s_]+/).filter(Boolean)
  if (parts.length >= 2) {
    return (parts[0]![0]! + parts[1]![0]!).toUpperCase()
  }
  return name.slice(0, 2).toUpperCase()
}

function IconPerson() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M12 12a4 4 0 1 0-4-4 4 4 0 0 0 4 4Zm0 2c-4 0-7 2-7 4v1h14v-1c0-2-3-4-7-4Z"
        fill="currentColor"
        opacity="0.45"
      />
    </svg>
  )
}

function IconBlocked() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2Zm0 18a8 8 0 0 1-8-8 8 8 0 0 1 8-8 8 8 0 0 1 8 8 8 8 0 0 1-8 8Z"
        fill="currentColor"
        opacity="0.35"
      />
      <path d="M6.34 6.34 17.66 17.66" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" opacity="0.45" />
    </svg>
  )
}

function IconSearch() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden className="friends-page__search-icon-svg">
      <path
        d="M10.5 18a7.5 7.5 0 1 1 0-15 7.5 7.5 0 0 1 0 15Zm6.5-2 4 4"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  )
}

export function Friends() {
  const { getToken } = useAuth()
  const navigate = useNavigate()

  const [tab, setTab] = useState<TabId>(0)
  const [showAddForm, setShowAddForm] = useState(false)
  const [friends, setFriends] = useState<FriendOut[]>([])
  const [incoming, setIncoming] = useState<FriendInvitationOut[]>([])
  const [outgoing, setOutgoing] = useState<FriendInvitationOut[]>([])
  const [blocked, setBlocked] = useState<BlockedUserOut[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [inviteDisplayName, setInviteDisplayName] = useState('')
  const [blockDisplayName, setBlockDisplayName] = useState('')
  const [friendSearch, setFriendSearch] = useState('')
  const [busy, setBusy] = useState(false)

  const reload = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [f, inv, bl] = await Promise.all([
        fetchFriends(getToken),
        fetchFriendInvitations(getToken),
        fetchBlockedUsers(getToken),
      ])
      setFriends(f)
      setIncoming(inv.incoming)
      setOutgoing(inv.outgoing)
      setBlocked(bl)
    } catch (e) {
      setError(formatError(e))
    } finally {
      setLoading(false)
    }
  }, [getToken])

  useEffect(() => {
    void reload()
  }, [reload])

  const filteredFriends = useMemo(() => {
    const q = friendSearch.trim().toLowerCase()
    if (!q) return friends
    return friends.filter((f) => {
      const name = (f.displayName ?? f.clerkUserId).toLowerCase()
      return name.includes(q)
    })
  }, [friends, friendSearch])

  const invitationTotal = incoming.length + outgoing.length

  async function onSendInviteByDisplayName() {
    setBusy(true)
    setError(null)
    try {
      const lookup = await lookupUserByDisplayName(getToken, inviteDisplayName)
      await sendFriendInvitation(getToken, lookup.clerkUserId)
      setInviteDisplayName('')
      setShowAddForm(false)
      await reload()
    } catch (e) {
      setError(formatError(e))
    } finally {
      setBusy(false)
    }
  }

  async function onBlockByDisplayName() {
    setBusy(true)
    setError(null)
    try {
      const lookup = await lookupUserByDisplayName(getToken, blockDisplayName)
      await blockUser(getToken, lookup.clerkUserId)
      setBlockDisplayName('')
      await reload()
    } catch (e) {
      setError(formatError(e))
    } finally {
      setBusy(false)
    }
  }

  function onRemoveFriend(f: FriendOut) {
    const label = f.displayName ?? f.clerkUserId
    if (
      !window.confirm(
        `Remove ${label} from your friends? You can send a new invitation later.`,
      )
    ) {
      return
    }
    setBusy(true)
    void removeFriend(getToken, f.clerkUserId)
      .then(reload)
      .catch((e) => setError(formatError(e)))
      .finally(() => setBusy(false))
  }

  return (
    <section className="friends-page">
      <header className="friends-page__header">
        <div className="friends-page__header-text">
          <h1 className="friends-page__title">Friends</h1>
          <p className="friends-page__subtitle">Manage your friends, invitations and blocks.</p>
        </div>
        <button
          type="button"
          className="friends-page__btn friends-page__btn--primary"
          onClick={() => setShowAddForm((v) => !v)}
        >
          + Add friend
        </button>
      </header>

      <div className="friends-page__tabs" role="tablist" aria-label="Friends sections">
        <button
          type="button"
          role="tab"
          aria-selected={tab === 0}
          className={`friends-page__tab${tab === 0 ? ' friends-page__tab--active' : ''}`}
          onClick={() => setTab(0)}
        >
          Friends
          <span className="friends-page__tab-count">{friends.length}</span>
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === 1}
          className={`friends-page__tab${tab === 1 ? ' friends-page__tab--active' : ''}`}
          onClick={() => setTab(1)}
        >
          Invitations
          {incoming.length > 0 ? (
            <span className="friends-page__tab-badge">{incoming.length}</span>
          ) : (
            <span className="friends-page__tab-count">{invitationTotal}</span>
          )}
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === 2}
          className={`friends-page__tab${tab === 2 ? ' friends-page__tab--active' : ''}`}
          onClick={() => setTab(2)}
        >
          Blocked
          <span className="friends-page__tab-count">{blocked.length}</span>
        </button>
      </div>

      {showAddForm ? (
        <div className="friends-page__add-card">
          <label className="friends-page__field-label">Invite by display name</label>
          <input
            className="friends-page__input"
            value={inviteDisplayName}
            onChange={(e) => setInviteDisplayName(e.target.value)}
            disabled={busy}
            autoComplete="off"
            placeholder="Their display name (must have an account)"
          />
          <div className="friends-page__add-actions">
            <button
              type="button"
              className="friends-page__btn friends-page__btn--primary friends-page__btn--grow"
              disabled={busy || !inviteDisplayName.trim()}
              onClick={() => void onSendInviteByDisplayName()}
            >
              Send invitation
            </button>
            <button
              type="button"
              className="friends-page__btn friends-page__btn--ghost"
              disabled={busy}
              onClick={() => {
                setShowAddForm(false)
                setInviteDisplayName('')
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      ) : null}

      {error ? (
        <p className="friends-page__banner friends-page__banner--error" role="alert">
          {error}
        </p>
      ) : null}

      {loading ? <p className="friends-page__loading">Loading…</p> : null}

      {!loading ? (
        <>
          {tab === 0 ? (
            <div className="friends-page__panel">
              <div className="friends-page__search-wrap">
                <IconSearch />
                <input
                  className="friends-page__search"
                  value={friendSearch}
                  onChange={(e) => setFriendSearch(e.target.value)}
                  placeholder="Search your friends…"
                  autoComplete="off"
                  aria-label="Search your friends"
                />
              </div>

              <div className="friends-page__list-card">
                {friends.length === 0 ? (
                  <div className="friends-page__empty friends-page__empty--padded">
                    <div className="friends-page__empty-icon">
                      <IconPerson />
                    </div>
                    <p className="friends-page__empty-title">No friends yet</p>
                    <p className="friends-page__empty-sub">
                      Add someone by their display name to get started.
                    </p>
                  </div>
                ) : filteredFriends.length === 0 ? (
                  <div className="friends-page__plain-empty friends-page__plain-empty--search">
                    No matching friends.
                  </div>
                ) : (
                  <ul className="friends-page__list">
                    {filteredFriends.map((f) => (
                      <li key={f.clerkUserId} className="friends-page__row">
                        <div
                          className={`friends-page__avatar${f.featured ? ' friends-page__avatar--featured' : ''}`}
                          aria-hidden
                        >
                          {initialsForFriend(f)}
                        </div>
                        <div className="friends-page__row-body">
                          <span className="friends-page__row-name">
                            {f.displayName ?? f.clerkUserId}
                          </span>
                        </div>
                        <div className="friends-page__row-actions">
                          <button
                            type="button"
                            className="friends-page__btn friends-page__btn--primary friends-page__btn--sm"
                            disabled={busy}
                            onClick={() =>
                              navigate(
                                `/challenge/create?friend=${encodeURIComponent(f.clerkUserId)}`,
                              )
                            }
                          >
                            Challenge
                          </button>
                          <button
                            type="button"
                            className="friends-page__btn friends-page__btn--danger friends-page__btn--sm"
                            disabled={busy}
                            onClick={() => onRemoveFriend(f)}
                          >
                            Remove
                          </button>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          ) : null}

          {tab === 1 ? (
            <div className="friends-page__panel">
              <section className="friends-page__invite-section">
                <h3 className="friends-page__section-label">Incoming</h3>
                {incoming.length === 0 ? (
                  <div className="friends-page__plain-empty">No incoming invitations</div>
                ) : (
                  <ul className="friends-page__list-card friends-page__list">
                    {incoming.map((inv) => (
                      <li key={inv.id} className="friends-page__row">
                        <div className="friends-page__avatar friends-page__avatar--incoming" aria-hidden>
                          {initialsFromName(inv.inviterDisplayName, inv.inviterClerkUserId)}
                        </div>
                        <div className="friends-page__row-body">
                          <span className="friends-page__row-name">
                            {inv.inviterDisplayName ?? inv.inviterClerkUserId}
                          </span>
                          <span className="friends-page__row-meta">{formatSentRelative(inv.createdAt)}</span>
                        </div>
                        <div className="friends-page__row-actions">
                          <button
                            type="button"
                            className="friends-page__btn friends-page__btn--accept friends-page__btn--sm"
                            disabled={busy}
                            onClick={() => {
                              setBusy(true)
                              void acceptFriendInvitation(getToken, inv.id)
                                .then(reload)
                                .catch((e) => setError(formatError(e)))
                                .finally(() => setBusy(false))
                            }}
                          >
                            Accept
                          </button>
                          <button
                            type="button"
                            className="friends-page__btn friends-page__btn--danger friends-page__btn--sm"
                            disabled={busy}
                            onClick={() => {
                              setBusy(true)
                              void declineFriendInvitation(getToken, inv.id)
                                .then(reload)
                                .catch((e) => setError(formatError(e)))
                                .finally(() => setBusy(false))
                            }}
                          >
                            Decline
                          </button>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </section>

              <section className="friends-page__invite-section">
                <h3 className="friends-page__section-label">Outgoing</h3>
                {outgoing.length === 0 ? (
                  <div className="friends-page__plain-empty">No outgoing invitations</div>
                ) : (
                  <ul className="friends-page__list-card friends-page__list">
                    {outgoing.map((inv) => (
                      <li key={inv.id} className="friends-page__row">
                        <div className="friends-page__avatar friends-page__avatar--outgoing" aria-hidden>
                          {initialsFromName(inv.inviteeDisplayName, inv.inviteeClerkUserId)}
                        </div>
                        <div className="friends-page__row-body">
                          <span className="friends-page__row-name">
                            {inv.inviteeDisplayName ?? inv.inviteeClerkUserId}
                          </span>
                          <span className="friends-page__row-meta">
                            {formatOutgoingInvitationMeta(inv.createdAt)}
                          </span>
                        </div>
                        <div className="friends-page__row-actions friends-page__row-actions--out">
                          <span className="friends-page__pending-badge">Pending</span>
                          <button
                            type="button"
                            className="friends-page__btn friends-page__btn--ghost friends-page__btn--sm"
                            disabled={busy}
                            onClick={() => {
                              setBusy(true)
                              void cancelFriendInvitation(getToken, inv.id)
                                .then(reload)
                                .catch((e) => setError(formatError(e)))
                                .finally(() => setBusy(false))
                            }}
                          >
                            Cancel
                          </button>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            </div>
          ) : null}

          {tab === 2 ? (
            <div className="friends-page__panel">
              <p className="friends-page__block-note">
                Neither of you can start a challenge with the other while a block exists. Blocks are
                mutual — they apply in both directions.
              </p>

              <div className="friends-page__add-card friends-page__add-card--block">
                <label className="friends-page__field-label">Block by display name</label>
                <input
                  className="friends-page__input"
                  value={blockDisplayName}
                  onChange={(e) => setBlockDisplayName(e.target.value)}
                  disabled={busy}
                  autoComplete="off"
                  placeholder="Display name to block"
                />
                <button
                  type="button"
                  className="friends-page__btn friends-page__btn--block"
                  disabled={busy || !blockDisplayName.trim()}
                  onClick={() => void onBlockByDisplayName()}
                >
                  Block
                </button>
              </div>

              <h3 className="friends-page__blocked-heading">{"People you've blocked"}</h3>

              <div className="friends-page__list-card">
                {blocked.length === 0 ? (
                  <div className="friends-page__empty friends-page__empty--padded">
                    <div className="friends-page__empty-icon">
                      <IconBlocked />
                    </div>
                    <p className="friends-page__empty-title">No blocked users</p>
                    <p className="friends-page__empty-sub">Anyone you block will appear here.</p>
                  </div>
                ) : (
                  <ul className="friends-page__list">
                    {blocked.map((b) => (
                      <li key={b.clerkUserId} className="friends-page__row">
                        <div className="friends-page__avatar friends-page__avatar--blocked" aria-hidden>
                          {initialsFromName(b.displayName, b.clerkUserId)}
                        </div>
                        <div className="friends-page__row-body">
                          <span className="friends-page__row-name">
                            {b.displayName ?? b.clerkUserId}
                          </span>
                        </div>
                        <div className="friends-page__row-actions">
                          <button
                            type="button"
                            className="friends-page__btn friends-page__btn--ghost friends-page__btn--sm"
                            disabled={busy}
                            onClick={() => {
                              setBusy(true)
                              void unblockUser(getToken, b.clerkUserId)
                                .then(reload)
                                .catch((e) => setError(formatError(e)))
                                .finally(() => setBusy(false))
                            }}
                          >
                            Unblock
                          </button>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          ) : null}
        </>
      ) : null}
    </section>
  )
}
