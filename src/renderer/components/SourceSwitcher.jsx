const SOURCES = [
  { key: 'web', label: 'Web' },
  { key: 'api', label: 'API' },
  { key: 'cli', label: 'CLI' },
  { key: 'all', label: 'All' },
]

export default function SourceSwitcher({ active, onChange, enabled }) {
  return (
    <div className="source-switcher no-drag">
      {SOURCES.map((s) => {
        const isOn = s.key === 'all' || enabled?.[s.key]
        if (!isOn && s.key !== 'all') return null
        return (
          <button
            key={s.key}
            className={`src-btn ${active === s.key ? 'active' : ''}`}
            onClick={() => onChange(s.key)}
          >
            {s.label}
          </button>
        )
      })}
    </div>
  )
}
