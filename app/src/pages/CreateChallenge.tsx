import { useEffect, useMemo, useState } from 'react'
import { useAuth, useUser } from '@clerk/react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { createChallenge } from '../api/challenges'
import { fetchFriends, type FriendOut } from '../api/friends'
import { lookupUserByDisplayName } from '../api/users'
import { GenerateChallengeLinkButton } from '../components/challenge/create/GenerateChallengeLinkButton'
import { OpponentDisplayNameInput } from '../components/challenge/create/OpponentDisplayNameInput'
import { SendChallengeInviteButton } from '../components/challenge/create/SendChallengeInviteButton'
import { formatError } from '../lib/formatError'

function challengerNameFromSession(user: ReturnType<typeof useUser>['user']): string {
  if (!user) return ''
  const full = user.fullName?.trim()
  if (full) return full
  const fn = user.firstName?.trim() ?? ''
  const ln = user.lastName?.trim() ?? ''
  const combined = `${fn} ${ln}`.trim()
  if (combined) return combined
  if (user.username) return user.username
  const em = user.primaryEmailAddress?.emailAddress
  if (em) {
    const local = em.split('@')[0]
    if (local) return local
  }
  return 'Challenger'
}

export function CreateChallenge() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const { userId, getToken } = useAuth()
  const { user, isLoaded } = useUser()
  const [opponentDisplayName, setOpponentDisplayName] = useState('')
  const [opponentNameForLink, setOpponentNameForLink] = useState('')
  const [loadingInvite, setLoadingInvite] = useState(false)
  const [loadingLink, setLoadingLink] = useState(false)
  const [loadingFriends, setLoadingFriends] = useState(false)
  const [friends, setFriends] = useState<FriendOut[]>([])
  const [selectedFriendClerkId, setSelectedFriendClerkId] = useState('')
  const [error, setError] = useState<string | null>(null)

  const challengerName = useMemo(() => challengerNameFromSession(user), [user])
  const challengerEmail = user?.primaryEmailAddress?.emailAddress ?? undefined

  const busy = loadingInvite || loadingLink || loadingFriends

  useEffect(() => {
    if (!user) return
    let cancelled = false
    setLoadingFriends(true)
    void fetchFriends(getToken)
      .then((list) => {
        if (!cancelled) setFriends(list)
      })
      .catch(() => {
        if (!cancelled) setFriends([])
      })
      .finally(() => {
        if (!cancelled) setLoadingFriends(false)
      })
    return () => {
      cancelled = true
    }
  }, [user, getToken])

  useEffect(() => {
    const clerkId = searchParams.get('friend')
    if (!clerkId) return
    if (loadingFriends) return
    if (friends.some((f) => f.clerkUserId === clerkId)) {
      setSelectedFriendClerkId(clerkId)
    }
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev)
        next.delete('friend')
        return next
      },
      { replace: true },
    )
  }, [searchParams, friends, loadingFriends, setSearchParams])

  async function onChallengeFriend() {
    setError(null)
    if (!selectedFriendClerkId) {
      setError('Select a friend first.')
      return
    }
    const name = challengerName.trim()
    if (!name) {
      setError('Sign in so we can use your profile for this challenge.')
      return
    }
    const f = friends.find((x) => x.clerkUserId === selectedFriendClerkId)
    if (!f) {
      setError('Friend not found in list.')
      return
    }
    setLoadingInvite(true)
    try {
      const res = await createChallenge({
        challengerName: name,
        opponentName: f.displayName?.trim() || 'Friend',
        challengerEmail,
        challengerClerkUserId: userId ?? undefined,
        opponentClerkUserId: f.clerkUserId,
      })
      navigate(`/c/${res.challenge.id}`)
    } catch (err) {
      setError(formatError(err))
    } finally {
      setLoadingInvite(false)
    }
  }

  async function onSendInvite() {
    setError(null)
    setLoadingInvite(true)
    try {
      const name = challengerName.trim()
      if (!name) {
        setError('Sign in so we can use your profile for this challenge.')
        return
      }
      const lookup = await lookupUserByDisplayName(getToken, opponentDisplayName)
      const res = await createChallenge({
        challengerName: name,
        opponentName: lookup.displayName?.trim() || opponentDisplayName.trim(),
        challengerEmail,
        challengerClerkUserId: userId ?? undefined,
        opponentClerkUserId: lookup.clerkUserId,
      })
      navigate(`/c/${res.challenge.id}`)
    } catch (err) {
      setError(formatError(err))
    } finally {
      setLoadingInvite(false)
    }
  }

  async function onGenerateLink() {
    setError(null)
    setLoadingLink(true)
    try {
      const name = challengerName.trim()
      if (!name) {
        setError('Sign in so we can use your profile for this challenge.')
        return
      }
      if (!opponentNameForLink.trim()) {
        setError('Enter an opponent name for the challenge.')
        return
      }
      const res = await createChallenge({
        challengerName: name,
        opponentName: opponentNameForLink.trim(),
        challengerEmail,
        challengerClerkUserId: userId ?? undefined,
      })
      navigate(`/c/${res.challenge.id}`)
    } catch (err) {
      setError(formatError(err))
    } finally {
      setLoadingLink(false)
    }
  }

  if (!isLoaded) {
    return (
      <section className="stack narrow">
        <h1 className="page-title">Create challenge</h1>
        <p className="muted">Loading…</p>
      </section>
    )
  }

  if (!user) {
    return (
      <section className="stack narrow">
        <h1 className="page-title">Create challenge</h1>
        <p className="lede">Sign in to create a challenge.</p>
      </section>
    )
  }

  return (
    <section className="stack narrow">
      <h1 className="page-title">Create challenge</h1>
      <p className="lede">
        You are challenging as <strong>{challengerName}</strong>. To invite someone with an
        account, search by their <strong>display name</strong> (same as in the app after sign-in).
        Or create a shareable link and label the opponent yourself.
      </p>

      <div className="card form stack">
        {error ? (
          <p className="banner banner-error" role="alert">
            {error}
          </p>
        ) : null}

        {friends.length > 0 ? (
          <div className="stack">
            <p className="muted" style={{ margin: 0 }}>
              Challenge a friend
            </p>
            <div className="actions wrap" style={{ alignItems: 'flex-end' }}>
              <label className="field" style={{ flex: '1 1 220px', marginBottom: 0 }}>
                <span>Pick from your friends</span>
                <select
                  value={selectedFriendClerkId}
                  onChange={(e) => setSelectedFriendClerkId(e.target.value)}
                  disabled={busy}
                >
                  <option value="">— Select —</option>
                  {friends.map((f) => (
                    <option key={f.clerkUserId} value={f.clerkUserId}>
                      {f.displayName ?? f.clerkUserId}
                    </option>
                  ))}
                </select>
              </label>
              <button
                type="button"
                className="btn btn-primary"
                disabled={busy || !selectedFriendClerkId}
                onClick={() => void onChallengeFriend()}
              >
                Start challenge
              </button>
            </div>
          </div>
        ) : null}

        {friends.length > 0 ? (
          <hr style={{ margin: '12px 0', borderColor: 'var(--border, #2a3140)' }} />
        ) : null}

        <div className="stack">
          <p className="muted" style={{ margin: 0 }}>
            Invite a member by display name
          </p>
          <div className="actions wrap" style={{ alignItems: 'flex-end' }}>
            <div style={{ flex: '1 1 200px', minWidth: 0 }}>
              <OpponentDisplayNameInput
                value={opponentDisplayName}
                onChange={setOpponentDisplayName}
                disabled={busy}
              />
            </div>
            <SendChallengeInviteButton
              onClick={onSendInvite}
              loading={loadingInvite}
              disabled={busy}
            />
          </div>
        </div>

        <hr style={{ margin: '12px 0', borderColor: 'var(--border, #2a3140)' }} />

        <div className="stack">
          <p className="muted" style={{ margin: 0 }}>
            Or create a link (opponent label only)
          </p>
          <label className="field">
            <span>Opponent name (shown on challenge)</span>
            <input
              name="opponentNameForLink"
              autoComplete="off"
              value={opponentNameForLink}
              onChange={(e) => setOpponentNameForLink(e.target.value)}
              disabled={busy}
            />
          </label>
          <div className="actions wrap">
            <GenerateChallengeLinkButton
              onClick={onGenerateLink}
              loading={loadingLink}
              disabled={busy}
            />
          </div>
        </div>
      </div>
    </section>
  )
}
