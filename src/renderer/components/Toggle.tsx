export function Toggle({ label, description, checked, onChange }: { label: string; description?: string; checked: boolean; onChange(checked: boolean): void }) {
  return <label className="toggle-row"><span><strong>{label}</strong>{description ? <small>{description}</small> : null}</span><input type="checkbox" role="switch" aria-label={label} checked={checked} onChange={e => onChange(e.target.checked)}/><span className="switch-track" aria-hidden="true"/></label>
}
