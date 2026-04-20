type Props = {
  id?: string
  value: string
  onChange: (value: string) => void
  disabled?: boolean
}

export function OpponentDisplayNameInput({
  id = 'opponent-display-name',
  value,
  onChange,
  disabled,
}: Props) {
  return (
    <label className="field">
      <span>Opponent display name</span>
      <input
        id={id}
        name="opponentDisplayName"
        autoComplete="off"
        placeholder="Same as their name in the app (after sign-in sync)"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
      />
    </label>
  )
}
