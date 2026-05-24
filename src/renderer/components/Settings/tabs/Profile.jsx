import { useState } from 'react'
import { useProfile } from '../../../hooks/useProfile'

export default function ProfileTab() {
  const { profiles, activeId, setActive, add, remove, update } = useProfile()
  const [editingId, setEditingId] = useState(null)
  const [editName, setEditName] = useState('')

  const startEdit = (p) => { setEditingId(p.id); setEditName(p.name) }
  const commitEdit = async () => {
    if (editingId && editName.trim()) {
      await update(editingId, { name: editName.trim() })
    }
    setEditingId(null)
  }

  return (
    <div className="tab-pane">
      <div className="tab-title">Profiles</div>

      <div className="profile-list">
        {profiles.map((p) => (
          <div key={p.id} className={`profile-card ${p.id === activeId ? 'active' : ''}`}>
            <div className="profile-card-row">
              <span className="profile-dot" style={{ background: p.color }} />
              <div className="profile-card-body">
                {editingId === p.id ? (
                  <input
                    className="wizard-input profile-edit-input"
                    autoFocus
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    onBlur={commitEdit}
                    onKeyDown={(e) => e.key === 'Enter' && commitEdit()}
                  />
                ) : (
                  <div className="profile-name" onDoubleClick={() => startEdit(p)}>{p.name}</div>
                )}
                <div className="profile-meta">
                  {p.hasClaudeWebKey ? 'Web ✓ ' : ''}
                  {p.hasAnthropicKey ? 'API ✓ ' : ''}
                  {p.sources?.cli ? 'CLI ✓' : ''}
                </div>
              </div>
              <div className="profile-actions">
                {p.id !== activeId && (
                  <button className="ctrl-btn" title="Set active" onClick={() => setActive(p.id)}>●</button>
                )}
                <button className="ctrl-btn" title="Rename" onClick={() => startEdit(p)}>✎</button>
                {profiles.length > 1 && (
                  <button className="ctrl-btn" title="Delete" onClick={() => remove(p.id)}>×</button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      <button className="settings-btn-secondary" onClick={add}>+ Add Profile</button>
    </div>
  )
}
