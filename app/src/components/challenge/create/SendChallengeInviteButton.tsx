import { Spinner } from '../../ui/Spinner'

type Props = {
  loading?: boolean
  disabled?: boolean
  onClick: () => void
}

export function SendChallengeInviteButton({
  loading,
  disabled,
  onClick,
}: Props) {
  return (
    <button
      className="btn btn-primary"
      type="button"
      onClick={onClick}
      disabled={disabled || loading}
    >
      {loading ? (
        <>
          <Spinner size="sm" />
          Sending…
        </>
      ) : (
        'Send'
      )}
    </button>
  )
}
