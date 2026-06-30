type ToggleSwitchProps = {
  checked: boolean;
  onChange: (nextChecked: boolean) => void;
  label?: string;
  onText?: string;
  offText?: string;
  title?: string;
};

export function ToggleSwitch({
  checked,
  onChange,
  label,
  onText = "On",
  offText = "Off",
  title,
}: ToggleSwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      title={title}
      onClick={() => onChange(!checked)}
      className={`toggle-switch${checked ? " is-on" : ""}`}
    >
      <span className="toggle-switch-track" aria-hidden="true">
        <span className="toggle-switch-thumb" />
      </span>
      <span className="toggle-switch-text">{checked ? onText : offText}</span>
    </button>
  );
}
