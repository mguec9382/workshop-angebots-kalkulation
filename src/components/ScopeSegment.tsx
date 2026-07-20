import type { ScopeStatus } from '../types'

const OPTIONS: { value: Exclude<ScopeStatus, 'unset'>; label: string }[] = [
  { value: 'in', label: 'In' },
  { value: 'opt', label: 'Opt' },
  { value: 'out', label: 'Out' },
]

/** Segmentierte In/Opt/Out-Pille im MBPC-Prozessschaubild-Stil. */
export function ScopeSegment({
  value,
  onChange,
  size = 'md',
}: {
  value: ScopeStatus
  onChange: (v: ScopeStatus) => void
  size?: 'sm' | 'md'
}) {
  return (
    <div className="scope-seg-group">
      {OPTIONS.map((o) => (
        <button
          key={o.value}
          data-scope={o.value}
          className={`scope-seg ${value === o.value ? 'active' : ''}`}
          style={{ padding: size === 'sm' ? '2px 8px' : '4px 11px', fontSize: size === 'sm' ? 10 : 12 }}
          onClick={() => onChange(value === o.value ? 'unset' : o.value)}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}
