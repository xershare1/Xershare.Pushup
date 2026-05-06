import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useAuth, useUser } from '@clerk/react'

import { createChallenge } from '../api/challenges'
import { fetchCreditBalance } from '../api/billing'
import { fetchFriends, type FriendOut } from '../api/friends'
import { formatError } from '../lib/formatError'
import { PageLoading } from '../components/ui/PageLoading'
import type { CreateChallengeResponse } from '../types/challenge'

import './CreateChallenge.css'

const STEP_LABELS = ['Choose opponent', 'Payment', 'Review & send', 'Challenge sent'] as const

const AVATAR_HUES = [24, 160, 200, 280, 48, 320]

function avatarHue(name: string): number {
  let h = 0
  for (let i = 0; i < name.length; i++) h = (h + name.charCodeAt(i) * 7) % 360
  return AVATAR_HUES[h % AVATAR_HUES.length]
}

function initialsFromName(name: string): string {
  const p = name.trim().split(/\s+/)
  if (p.length >= 2) {
    return (p[0]!.charAt(0) + p[1]!.charAt(0)).toUpperCase()
  }
  return name.trim().slice(0, 2).toUpperCase() || '?'
}

type PayKind = 'self' | 'both'

type OpponentSelection = {
  key: string
  opponentClerkUserId: string | null
  displayName: string
  personalBest: number | null
  rank: number | null
  line2: string
}

type WizardStep = 1 | 2 | 3 | 4

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

function IconCheck() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden>
      <path d="M20 6L9 17l-5-5" />
    </svg>
  )
}

function IconSearch() {
  return (
    <svg className="cc-search-ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <circle cx="11" cy="11" r="7" />
      <path d="M20 20l-3-3" />
    </svg>
  )
}

export function CreateChallenge() {
  const { userId, getToken } = useAuth()
  const { user, isLoaded } = useUser()
  const [searchParams, setSearchParams] = useSearchParams()

  const [step, setStep] = useState<WizardStep>(1)
  const [searchQuery, setSearchQuery] = useState('')

  const [friends, setFriends] = useState<FriendOut[]>([])
  const [loadLists, setLoadLists] = useState(true)
  const [listsError, setListsError] = useState(false)

  const [selection, setSelection] = useState<OpponentSelection | null>(null)

  const [payKind, setPayKind] = useState<PayKind>('self')
  const [balance, setBalance] = useState<number | null>(null)
  const [loadBalance, setLoadBalance] = useState(true)
  const [sending, setSending] = useState(false)
  const [sendError, setSendError] = useState<string | null>(null)
  const [createResult, setCreateResult] = useState<CreateChallengeResponse | null>(null)

  const challengerName = useMemo(() => challengerNameFromSession(user), [user])
  const challengerEmail = user?.primaryEmailAddress?.emailAddress ?? undefined

  const q = searchQuery.trim().toLowerCase()

  const friendsFiltered = useMemo(() => {
    if (!q) return friends
    return friends.filter((f) => (f.displayName || '').toLowerCase().includes(q))
  }, [friends, q])

  const friendsForUI = useMemo(
    () =>
      friendsFiltered.map((f) => {
        const name = f.displayName?.trim() || 'Member'
        return {
          friend: f,
          name,
          line2: 'Friend',
          personalBest: null as number | null,
        }
      }),
    [friendsFiltered],
  )

  const refreshBalance = useCallback(async () => {
    setLoadBalance(true)
    try {
      const b = await fetchCreditBalance(getToken)
      setBalance(b)
    } catch {
      setBalance(null)
    } finally {
      setLoadBalance(false)
    }
  }, [getToken])

  useEffect(() => {
    if (!user) return
    let c = false
    setLoadLists(true)
    setListsError(false)
    void fetchFriends(getToken)
      .then((f) => {
        if (!c) setFriends(f)
      })
      .catch(() => {
        if (!c) {
          setListsError(true)
          setFriends([])
        }
      })
      .finally(() => {
        if (!c) setLoadLists(false)
      })
    return () => {
      c = true
    }
  }, [user, getToken])

  useEffect(() => {
    if (!user) return
    void refreshBalance()
  }, [user, refreshBalance])

  const friendClerkToPreselect = searchParams.get('friend')

  useEffect(() => {
    if (!friendClerkToPreselect || loadLists) return
    const f = friends.find((x) => x.clerkUserId === friendClerkToPreselect)
    if (f) {
      const n = f.displayName?.trim() || 'Friend'
      setSelection({
        key: `f:${f.clerkUserId}`,
        opponentClerkUserId: f.clerkUserId,
        displayName: n,
        personalBest: null,
        rank: null,
        line2: 'Friend',
      })
    }
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev)
        next.delete('friend')
        return next
      },
      { replace: true },
    )
  }, [friendClerkToPreselect, friends, loadLists, setSearchParams])

  function resetWizard() {
    setStep(1)
    setSelection(null)
    setPayKind('self')
    setCreateResult(null)
    setSendError(null)
    setSearchQuery('')
  }

  function selectFriend(friend: FriendOut) {
    const n = friend.displayName?.trim() || 'Friend'
    setSelection({
      key: `f:${friend.clerkUserId}`,
      opponentClerkUserId: friend.clerkUserId,
      displayName: n,
      personalBest: null,
      rank: null,
      line2: 'Friend',
    })
  }

  const bal = balance ?? 0
  const canPaySelf = bal >= 1
  const canPayBoth = bal >= 2
  const cost = payKind === 'both' ? 2 : 1
  const balanceAfterPreview = Math.max(0, bal - cost)

  const oName = selection?.displayName?.trim() || 'Opponent'
  const oHue = avatarHue(oName)
  const oInitial = oName.charAt(0).toUpperCase()

  const onCreate = async (coverOpponentEntry: boolean) => {
    if (!userId || !selection?.opponentClerkUserId) {
      throw new Error('Select a valid opponent.')
    }
    return createChallenge({
      challengerName: challengerName.trim(),
      opponentName: selection.displayName,
      challengerEmail,
      challengerClerkUserId: userId ?? undefined,
      opponentClerkUserId: selection.opponentClerkUserId,
      coverOpponentEntry,
    })
  }

  async function onSendChallenge() {
    setSendError(null)
    if (!selection?.opponentClerkUserId) return
    setSending(true)
    try {
      const res = await onCreate(payKind === 'both')
      setCreateResult(res)
      setStep(4)
      void refreshBalance()
    } catch (e) {
      setSendError(formatError(e))
    } finally {
      setSending(false)
    }
  }

  if (!isLoaded) {
    return (
      <div className="cc-wizard">
        <div className="cc-wizard__main" style={{ padding: 32 }}>
          <h1 className="cc-h1">Challenge setup</h1>
          <PageLoading
            pageDensity="tight"
            message="Loading…"
            messageClassName="app-page-loading__msg cc-lede"
            className="cc-wizard__page-loading"
          />
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="cc-wizard">
        <div className="cc-wizard__main" style={{ padding: 32 }}>
          <h1 className="cc-h1">Challenge setup</h1>
          <p className="cc-lede" style={{ margin: 0 }}>
            Sign in to create a challenge.
          </p>
        </div>
      </div>
    )
  }

  const stepperIndices = [0, 1, 2, 3]

  return (
    <div className="cc-wizard">
      <aside className="cc-wizard__step-col" aria-label="Challenge progress">
        <p className="cc-wizard__step-col-label">Challenge setup</p>
        <ol className="cc-wizard__steplist">
          {stepperIndices.map((i) => {
            const sn = (i + 1) as WizardStep
            const isDone = step > sn
            const isActive = step === sn
            return (
              <li key={STEP_LABELS[i]}>
                {i > 0 ? (
                  <div
                    className={
                      isDone || step > i
                        ? 'cc-wizard__step-conn cc-wizard__step-conn--done'
                        : 'cc-wizard__step-conn'
                    }
                    aria-hidden
                  />
                ) : null}
                <div className="cc-wizard__step-item">
                  <div
                    className={
                      isActive
                        ? 'cc-wizard__step-circle cc-wizard__step-circle--active'
                        : isDone
                          ? 'cc-wizard__step-circle cc-wizard__step-circle--done'
                          : 'cc-wizard__step-circle'
                    }
                  >
                    {isDone && !isActive ? <IconCheck /> : i + 1}
                  </div>
                  <div
                    className={
                      isActive
                        ? 'cc-wizard__step-text cc-wizard__step-text--active'
                        : isDone
                          ? 'cc-wizard__step-text cc-wizard__step-text--done'
                          : 'cc-wizard__step-text'
                    }
                  >
                    {STEP_LABELS[i]}
                  </div>
                </div>
              </li>
            )
          })}
        </ol>
        <div className="cc-wizard__escape">
          <p className="cc-wizard__escape-lab">Just practicing?</p>
          <Link to="/solo">Solo session →</Link>
        </div>
      </aside>

      <div className="cc-wizard__main">
        <p className="cc-wizard__mobile-step" aria-current="step">
          Step {step} of 4 — <em>{STEP_LABELS[step - 1]}</em>
        </p>

        {step === 1 ? (
          <StepChooseOpponent
            searchQuery={searchQuery}
            onSearch={setSearchQuery}
            loadLists={loadLists}
            listsError={listsError}
            friends={friendsForUI}
            selectionKey={selection?.key ?? null}
            selectedDisplayName={selection?.opponentClerkUserId ? selection.displayName : null}
            onSelectFriend={selectFriend}
            onContinue={() => {
              if (!selection?.opponentClerkUserId) return
              setStep(2)
            }}
            canContinue={Boolean(selection?.opponentClerkUserId)}
          />
        ) : null}

        {step === 2 ? (
          <StepPayment
            payKind={payKind}
            onPayKind={setPayKind}
            oHue={oHue}
            oInitial={oInitial}
            oName={oName}
            line2={selection!.line2}
            loadBalance={loadBalance}
            bal={bal}
            canPaySelf={canPaySelf}
            canPayBoth={canPayBoth}
            onBack={() => setStep(1)}
            onChangeOpponent={() => setStep(1)}
            onContinue={() => {
              if (loadBalance) return
              if (bal < 1) return
              if (payKind === 'both' && !canPayBoth) return
              setStep(3)
            }}
            continueDisabled={loadBalance || !canPaySelf || (payKind === 'both' && !canPayBoth) || bal < 1}
            zeroBalance={!loadBalance && bal === 0}
          />
        ) : null}

        {step === 3 && selection ? (
          <StepReview
            oName={oName}
            payKind={payKind}
            loadBalance={loadBalance}
            cost={cost}
            balanceAfter={balanceAfterPreview}
            onBack={() => setStep(2)}
            onSend={() => void onSendChallenge()}
            sending={sending}
            sendError={sendError}
          />
        ) : null}

        {step === 4 && createResult ? (
          <StepSent
            oName={oName}
            gifted={Boolean(createResult.challenge.gifted)}
            createResult={createResult}
            onNewChallenge={resetWizard}
          />
        ) : null}

        <div className="cc-wizard__escape--mobile" aria-label="Solo">
          <p className="cc-wizard__escape-lab">Just practicing?</p>
          <Link to="/solo">Solo session →</Link>
        </div>
      </div>
    </div>
  )
}

// ---- Step 1

type FriendRowIn = { friend: FriendOut; name: string; line2: string; personalBest: number | null }

type Step1Props = {
  searchQuery: string
  onSearch: (q: string) => void
  loadLists: boolean
  listsError: boolean
  friends: FriendRowIn[]
  selectionKey: string | null
  selectedDisplayName: string | null
  onSelectFriend: (f: FriendOut) => void
  onContinue: () => void
  canContinue: boolean
}

function StepChooseOpponent(p: Step1Props) {
  const continueLabel = p.selectedDisplayName ? `Continue with ${p.selectedDisplayName} →` : 'Continue →'
  return (
    <>
      <h1 className="cc-h1">Who do you want to challenge?</h1>
      <p className="cc-lede">Pick a friend or search by display name.</p>

      {p.listsError ? <div className="cc-err">Could not load friends. Try again later.</div> : null}

      <div className="cc-search-wrap">
        <IconSearch />
        <input
          type="search"
          className="cc-search"
          placeholder="Search by display name…"
          value={p.searchQuery}
          onChange={(e) => p.onSearch(e.target.value)}
          autoComplete="off"
          enterKeyHint="search"
        />
      </div>

      {p.loadLists ? (
        <PageLoading layout="inline" message="Loading…" messageClassName="cc-lede" />
      ) : null}

      {!p.loadLists && p.friends.length > 0 ? (
        <section>
          <h2 className="cc-sec-lab">Your friends</h2>
          {p.friends.map((row) => {
            const key = `f:${row.friend.clerkUserId}`
            return (
              <OpponentRow
                key={row.friend.clerkUserId}
                name={row.name}
                selected={p.selectionKey === key}
                line2={row.line2}
                personalBest={row.personalBest}
                onSelect={() => p.onSelectFriend(row.friend)}
              />
            )
          })}
        </section>
      ) : null}

      {!p.loadLists && p.friends.length === 0 && !p.listsError ? (
        <p className="cc-lede" style={{ marginTop: 0 }}>
          No friends yet. Search by display name above or share your profile so others can add you.
        </p>
      ) : null}

      <p className="cc-note-amber">
        Don’t see who you’re looking for? <strong>Search by display name above</strong> — after you send a challenge,
        you can copy a shareable link from the confirmation step.
      </p>

      <button
        type="button"
        className="cc-btn cc-btn--primary"
        style={{ width: '100%', marginTop: 8 }}
        disabled={!p.canContinue}
        onClick={p.onContinue}
      >
        {continueLabel}
      </button>
    </>
  )
}

function OpponentRow(p: {
  name: string
  line2: string
  personalBest: number | null
  selected: boolean
  onSelect: () => void
}) {
  const h = avatarHue(p.name)
  return (
    <button
      type="button"
      className={`cc-opp${p.selected ? ' cc-opp--sel' : ''}`}
      onClick={p.onSelect}
    >
      <div className="cc-opp__av" style={{ background: `hsl(${h} 50% 36%)` }} aria-hidden>
        {initialsFromName(p.name)}
      </div>
      <div className="cc-opp__mid">
        <p className="cc-opp__name">{p.name}</p>
        <p className="cc-opp__meta">{p.line2}</p>
      </div>
      <div className="cc-opp__stat">
        <span className="cc-opp__stat-n">{p.personalBest != null ? p.personalBest : '—'}</span>
        <span className="cc-opp__stat-lab">best reps</span>
      </div>
      <div className="cc-opp__radio" aria-hidden>
        {p.selected ? <IconCheck /> : null}
      </div>
    </button>
  )
}

// ---- Step 2

type StepPaymentProps = {
  payKind: PayKind
  onPayKind: (k: PayKind) => void
  oHue: number
  oInitial: string
  oName: string
  line2: string
  loadBalance: boolean
  bal: number
  canPaySelf: boolean
  canPayBoth: boolean
  onBack: () => void
  onChangeOpponent: () => void
  onContinue: () => void
  continueDisabled: boolean
  zeroBalance: boolean
}

function StepPayment(p: StepPaymentProps) {
  return (
    <>
      <h1 className="cc-h1">How do you want to pay?</h1>
      <p className="cc-lede">Choose whether to cover just your entry or both.</p>

      <div className="cc-recap">
        <div className="cc-recap__av" style={{ background: `hsl(${p.oHue} 50% 36%)` }} aria-hidden>
          {p.oInitial}
        </div>
        <div className="cc-recap__mid">
          <p className="cc-recap__name">{p.oName}</p>
          <p className="cc-recap__meta">{p.line2}</p>
        </div>
        <button type="button" className="cc-recap__change" onClick={p.onChangeOpponent}>
          Change
        </button>
      </div>

      <div className="cc-bal">
        <span className="cc-bal__l">Your credit balance</span>
        <span className="cc-bal__r">{p.loadBalance ? '—' : `${p.bal} credit${p.bal === 1 ? '' : 's'}`}</span>
      </div>

      <div style={{ position: 'relative' }}>
        <button
          type="button"
          className={`cc-pay${p.payKind === 'self' ? ' cc-pay--sel' : ''}`}
          onClick={() => p.onPayKind('self')}
          disabled={p.loadBalance || !p.canPaySelf}
        >
          <div className="cc-pay__rd" aria-hidden>
            {p.payKind === 'self' ? <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#fff' }} /> : null}
          </div>
          <div className="cc-pay__body">
            <p className="cc-pay__title">Pay for myself</p>
            <p className="cc-pay__desc">Standard. Your opponent pays 1 credit to accept.</p>
          </div>
          <div className="cc-pay__cost">
            <span className="cc-pay__cost-n">1</span>
            <span className="cc-pay__cost-u">credit</span>
          </div>
        </button>
      </div>

      <div style={{ position: 'relative' }}>
        <span className="cc-gen-badge" aria-hidden>
          Generous
        </span>
        <button
          type="button"
          className={`cc-pay${p.payKind === 'both' ? ' cc-pay--sel' : ''}`}
          onClick={() => p.onPayKind('both')}
          disabled={p.loadBalance || !p.canPayBoth}
          title={!p.canPayBoth && p.bal < 2 && p.bal > 0 ? 'You need 2 credits to cover both entries.' : undefined}
        >
          <div className="cc-pay__rd" aria-hidden>
            {p.payKind === 'both' ? <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#fff' }} /> : null}
          </div>
          <div className="cc-pay__body">
            <p className="cc-pay__title">Pay for both of us</p>
            <p className="cc-pay__desc">Cover your opponent’s entry — they accept for free. Best way to guarantee they respond.</p>
            <span className="cc-tag" aria-hidden>
              Covers opponent’s entry
            </span>
          </div>
          <div className="cc-pay__cost">
            <span className="cc-pay__cost-n">2</span>
            <span className="cc-pay__cost-u">credits</span>
          </div>
        </button>
        {!p.canPayBoth && p.bal < 2 && p.bal > 0 && !p.loadBalance ? (
          <p className="cc-lede" style={{ margin: '4px 0 0', fontSize: 12 }}>
            You need 2 credits to cover both entries.
          </p>
        ) : null}
      </div>

      {p.zeroBalance ? (
        <div className="cc-btns" style={{ marginTop: 24 }}>
          <button type="button" className="cc-btn cc-btn--ghost" onClick={p.onBack}>
            ← Back
          </button>
          <Link to="/credits" className="cc-btn cc-btn--primary" style={{ flex: 1, textAlign: 'center' }}>
            Top up credits
          </Link>
        </div>
      ) : (
        <div className="cc-btns" style={{ marginTop: 24 }}>
          <button type="button" className="cc-btn cc-btn--ghost" onClick={p.onBack}>
            ← Back
          </button>
          <button type="button" className="cc-btn cc-btn--primary" onClick={p.onContinue} disabled={p.continueDisabled}>
            Continue →
          </button>
        </div>
      )}
    </>
  )
}

// ---- Step 3

type StepReviewProps = {
  oName: string
  payKind: PayKind
  loadBalance: boolean
  cost: number
  balanceAfter: number
  onBack: () => void
  onSend: () => void
  sending: boolean
  sendError: string | null
}

function StepReview(p: StepReviewProps) {
  const gifted = p.payKind === 'both'
  return (
    <>
      <h1 className="cc-h1">Review & send</h1>
      <p className="cc-lede">Everything looks good? Send the challenge.</p>
      {p.sendError ? <div className="cc-err">{p.sendError}</div> : null}

      <div className="cc-sum">
        <div className="cc-sum__row">
          <span className="cc-sum__l">Challenging</span>
          <span className="cc-sum__v">{p.oName}</span>
        </div>
        <div className="cc-sum__row">
          <span className="cc-sum__l">Your entry</span>
          <span className="cc-sum__v cc-sum__v--ded">−1 credit</span>
        </div>
        {gifted ? (
          <div className="cc-sum__row">
            <span className="cc-sum__l">Opponent&apos;s entry</span>
            <span className="cc-sum__v cc-sum__v--ok">Covered by you</span>
          </div>
        ) : null}
        <div className="cc-sum__row">
          <span className="cc-sum__l">Total</span>
          <span className="cc-sum__v cc-sum__v--tot">{p.cost} credit{p.cost === 1 ? '' : 's'}</span>
        </div>
        <div className="cc-sum__row">
          <span className="cc-sum__l">Balance after</span>
          <span className="cc-sum__v">{p.loadBalance ? '—' : `${p.balanceAfter} credit${p.balanceAfter === 1 ? '' : 's'}`}</span>
        </div>
        <div className="cc-sum__row">
          <span className="cc-sum__l">Expires in</span>
          <span className="cc-sum__v">48 hours</span>
        </div>
      </div>

      {gifted ? (
        <div className="cc-banner-ok" role="status">
          <span className="cc-banner-ok__ico" aria-hidden>
            ✓
          </span>
          <span>
            <b>{p.oName} receives a free challenge.</b> If they don&apos;t respond in 48h, both credits are automatically
            refunded.
          </span>
        </div>
      ) : null}

      <div className="cc-btns">
        <button type="button" className="cc-btn cc-btn--ghost" onClick={p.onBack} disabled={p.sending}>
          ← Back
        </button>
        <button type="button" className="cc-btn cc-btn--primary" onClick={p.onSend} disabled={p.sending}>
          {p.sending ? 'Sending…' : 'Send challenge →'}
        </button>
      </div>
    </>
  )
}

// ---- Step 4

type StepSentProps = {
  oName: string
  gifted: boolean
  createResult: CreateChallengeResponse
  onNewChallenge: () => void
}

function StepSent(p: StepSentProps) {
  const spent = p.gifted ? 2 : 1
  const bAfter = p.createResult.balanceAfter
  const shareUrl = p.createResult.shareLink

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(shareUrl)
    } catch {
      /* ignore */
    }
  }

  async function shareLink() {
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({ title: 'Pushup challenge', text: 'Join my challenge on Pushup Pros', url: shareUrl })
        return
      } catch {
        /* fallback */
      }
    }
    void copyLink()
  }

  function sendToFriend() {
    const q = encodeURIComponent(`Join my challenge: ${shareUrl}`)
    window.open(`mailto:?body=${q}`, '_blank', 'noopener,noreferrer')
  }

  return (
    <>
      <div className="cc-sent-ico" aria-hidden>
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
          <path d="M20 6L9 17l-5-5" />
        </svg>
      </div>
      <h1 className="cc-h1" style={{ textAlign: 'center' }}>
        Challenge sent!
      </h1>
      <p className="cc-lede" style={{ textAlign: 'center', maxWidth: 480, marginLeft: 'auto', marginRight: 'auto' }}>
        {p.gifted ? (
          <>
            You covered both entries. {p.oName} can accept for free — they have 48 hours to respond.
          </>
        ) : (
          <>{p.oName} has been challenged. They have 48 hours to accept.</>
        )}
      </p>

      <div className="cc-share">
        <p className="cc-share__lab">Share challenge link</p>
        <div className="cc-share__row">
          <span className="cc-share__url" title={shareUrl}>
            {shareUrl}
          </span>
          <button type="button" className="cc-share__copy" onClick={() => void copyLink()}>
            Copy
          </button>
        </div>
        <div className="cc-share__actions">
          <button type="button" className="cc-share__act" onClick={() => void shareLink()}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
              <path d="M4 12v7a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-7" />
              <path d="M16 6l-4-4-4 4" />
              <path d="M12 2v15" />
            </svg>
            Share link
          </button>
          <button type="button" className="cc-share__act" onClick={() => void copyLink()}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
              <rect x="9" y="9" width="12" height="12" rx="2" />
              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
            </svg>
            Copy to clipboard
          </button>
          <button type="button" className="cc-share__act" onClick={sendToFriend}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
              <path d="M4 4h16v16H4z" opacity="0.2" />
              <path d="M22 2L11 13" />
              <path d="M22 2l-7 20-4-9-9-4 20-7z" />
            </svg>
            Send to friend
          </button>
        </div>
      </div>

      <div className="cc-sum">
        <div className="cc-sum__row">
          <span className="cc-sum__l">Credits spent</span>
          <span className="cc-sum__v cc-sum__v--ded">−{spent} credit{spent === 1 ? '' : 's'}</span>
        </div>
        <div className="cc-sum__row">
          <span className="cc-sum__l">Remaining balance</span>
          <span className="cc-sum__v">{typeof bAfter === 'number' ? `${bAfter} credit${bAfter === 1 ? '' : 's'}` : '—'}</span>
        </div>
        <div className="cc-sum__row">
          <span className="cc-sum__l">Opponent notified</span>
          <span className="cc-sum__v cc-sum__v--ok">
            {p.gifted ? '✓ Free to accept' : '✓ Notified'}
          </span>
        </div>
      </div>

      <div className="cc-btns" style={{ marginTop: 8 }}>
        <button type="button" className="cc-btn cc-btn--ghost" onClick={p.onNewChallenge}>
          New challenge
        </button>
        <Link to="/dashboard" className="cc-btn cc-btn--primary" style={{ flex: 1, textAlign: 'center' }}>
          Back to dashboard
        </Link>
      </div>
    </>
  )
}
