const RINGS = [
  { key: 'session', label: 'Session (5h)' },
  { key: 'weekly',  label: 'Weekly (7d)'  },
  { key: 'design',  label: 'Design Usage' },
]

const STYLES = [
  { value: 'cards', label: 'Cards', icon: '▤' },
  { value: 'rings', label: 'Rings', icon: '◎' },
]

export default function DisplayTab({ settings, patch }) {
  const vis = settings.visibleRings ?? { session: true, weekly: true, design: true }
  const toggleRing = (key) =>
    patch({ visibleRings: { ...vis, [key]: !vis[key] } })

  return (
    <div className="tab-pane">
      <div className="tab-title">Display</div>

      <div className="settings-label">Show Rings</div>
      <div className="ring-toggles">
        {RINGS.map(({ key, label }) => (
          <label key={key} className="ring-toggle-row">
            <span className="settings-value">{label}</span>
            <label className="toggle">
              <input
                type="checkbox"
                checked={vis[key] ?? true}
                onChange={() => toggleRing(key)}
              />
              <span className="toggle-track" />
            </label>
          </label>
        ))}
      </div>

      <div className="tab-divider" />

      <div className="settings-label">Display Style</div>
      <div className="interval-group">
        {STYLES.map((s) => (
          <button
            key={s.value}
            className={`interval-btn style-btn ${settings.ringStyle === s.value ? 'active' : ''}`}
            onClick={() => patch({ ringStyle: s.value })}
          >
            <span className="style-icon">{s.icon}</span>
            <span>{s.label}</span>
          </button>
        ))}
      </div>

    </div>
  )
}
