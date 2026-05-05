import { Spinner } from '../../ui/Spinner'

type Props = {
  loading?: boolean
  disabled?: boolean
  onClick: () => void
}

export function GenerateChallengeLinkButton({
  loading,
  disabled,
  onClick,
}: Props) {
  return (
    <button
      className="btn btn-secondary"
      type="button"
      onClick={onClick}
      disabled={disabled || loading}
    >
      {loading ? (
        <>
          <Spinner size="sm" />
          Creating…
        </>
      ) : (
        'Generate challenge link'
      )}
    </button>
  )
}
