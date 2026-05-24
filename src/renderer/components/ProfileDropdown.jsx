import { useState, useEffect, useRef } from 'react'
import { useProfile } from '../hooks/useProfile'

export default function ProfileDropdown() {
  const { profiles, active, setActive } = useProfile()
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    const onDoc = (e) => { if (!ref.current?.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [])

  if (!active) return null
  return (
    <div className="profile-dd no-drag" ref={ref}>
      <button className="profile-dd-trigger" onClick={() => setOpen((o) => !o)}>
        <span className="profile-dot" style={{ background: active.color }} />
        <span className="profile-dd-name">{active.name}</span>
        <span className="profile-dd-caret">▾</span>
      </button>
      {open && (
        <div className="profile-dd-menu">
          {profiles.map((p) => (
            <button
              key={p.id}
              className={`profile-dd-item ${p.id === active.id ? 'active' : ''}`}
              onClick={() => { setActive(p.id); setOpen(false) }}
            >
              <span className="profile-dot" style={{ background: p.color }} />
              <span>{p.name}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
