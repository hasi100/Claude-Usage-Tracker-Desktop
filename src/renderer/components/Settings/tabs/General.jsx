export default function GeneralTab({ settings, patch }) {
  return (
    <div className="tab-pane">
      <div className="tab-title">General</div>

      <label className="ring-toggle-row">
        <span className="settings-value">Start on Login</span>
        <label className="toggle">
          <input
            type="checkbox"
            checked={!!settings.autoStart}
            onChange={(e) => patch({ autoStart: e.target.checked })}
          />
          <span className="toggle-track" />
        </label>
      </label>

      <label className="ring-toggle-row">
        <span className="settings-value">Always on Top</span>
        <label className="toggle">
          <input
            type="checkbox"
            checked={settings.alwaysOnTop ?? true}
            onChange={(e) => patch({ alwaysOnTop: e.target.checked })}
          />
          <span className="toggle-track" />
        </label>
      </label>

      <div className="tab-divider" />

      <div className="settings-label">
        Window Opacity — {Math.round((settings.opacity ?? 0.9) * 100)}%
      </div>
      <input
        type="range"
        min={40}
        max={100}
        value={Math.round((settings.opacity ?? 0.9) * 100)}
        onChange={(e) => patch({ opacity: Number(e.target.value) / 100 })}
        className="opacity-slider"
      />

      <div className="tab-divider" />

      <div className="settings-footer">
        <span className="settings-version">v1.0.0</span>
        <button
          className="settings-link"
          onClick={() => window.electronAPI?.openExternal('https://github.com/hasi100/Claude-Usage-Tracker-Desktop')}
        >
          GitHub ↗
        </button>
      </div>
    </div>
  )
}
