const NAV = ['Profile', 'Auth', 'Sources', 'Display', 'Mobile', 'General']

export default function SettingsSidebar({ active, onChange, onClose }) {
  return (
    <aside className="settings-sidebar">
      <div className="settings-sidebar-header">
        <span className="settings-sidebar-title">Settings</span>
        <button className="settings-close" onClick={onClose} title="Close">×</button>
      </div>
      <nav className="settings-nav">
        {NAV.map((label) => {
          const id = label.toLowerCase()
          return (
            <button
              key={id}
              className={`settings-nav-item ${active === id ? 'active' : ''}`}
              onClick={() => onChange(id)}
            >
              {label}
            </button>
          )
        })}
      </nav>
    </aside>
  )
}
