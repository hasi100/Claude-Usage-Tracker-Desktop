import { useProfile } from '../../../hooks/useProfile'

const SOURCES = [
  { key: 'web', label: 'Web (claude.ai)',  hint: 'Session + weekly rings' },
  { key: 'api', label: 'API Console',      hint: 'Monthly cost + per-model' },
  { key: 'cli', label: 'Claude Code CLI',  hint: 'Local ~/.claude/projects' },
]

const INTERVALS = [
  { label: '30s', value: 30 },
  { label: '1m',  value: 60 },
  { label: '2m',  value: 120 },
]

export default function SourcesTab({ settings, patch }) {
  const { active, update } = useProfile()
  const sources = active?.sources ?? { web: true, api: false, cli: false }

  const toggle = (key) => {
    if (!active) return
    update(active.id, { sources: { ...sources, [key]: !sources[key] } })
  }

  return (
    <div className="tab-pane">
      <div className="tab-title">Data Sources</div>

      <div className="sources-list">
        {SOURCES.map(({ key, label, hint }) => (
          <label key={key} className="source-row">
            <div className="source-meta">
              <div className="source-label">{label}</div>
              <div className="source-hint">{hint}</div>
            </div>
            <label className="toggle">
              <input
                type="checkbox"
                checked={!!sources[key]}
                onChange={() => toggle(key)}
              />
              <span className="toggle-track" />
            </label>
          </label>
        ))}
      </div>

      <div className="tab-divider" />

      <div className="settings-label">Refresh Interval</div>
      <div className="interval-group">
        {INTERVALS.map((i) => (
          <button
            key={i.value}
            className={`interval-btn ${settings.refreshInterval === i.value ? 'active' : ''}`}
            onClick={() => patch({ refreshInterval: i.value })}
          >
            {i.label}
          </button>
        ))}
      </div>
    </div>
  )
}
