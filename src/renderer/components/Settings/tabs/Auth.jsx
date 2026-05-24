import { useState } from 'react'
import { useProfile } from '../../../hooks/useProfile'

export default function AuthTab({ authState, onReauth }) {
  const { active, update } = useProfile()
  const [sessionKey, setSessionKey] = useState('')
  const [adminKey, setAdminKey] = useState('')
  const [savingS, setSavingS] = useState(false)
  const [savingA, setSavingA] = useState(false)
  const [errS, setErrS] = useState(null)
  const [errA, setErrA] = useState(null)

  const saveSession = async () => {
    if (!sessionKey.trim()) return
    setSavingS(true); setErrS(null)
    const r = await window.electronAPI?.saveSessionKey?.(sessionKey.trim())
    if (!r?.ok) setErrS(r?.error ?? 'Failed')
    else { setSessionKey(''); onReauth?.() }
    setSavingS(false)
  }

  const saveAdmin = async () => {
    if (!adminKey.trim()) return
    setSavingA(true); setErrA(null)
    const r = await window.electronAPI?.saveAdminKey?.(adminKey.trim())
    if (!r?.ok) setErrA(r?.error ?? 'Failed')
    else { setAdminKey('') }
    setSavingA(false)
  }

  return (
    <div className="tab-pane">
      <div className="tab-title">Authentication</div>

      <div className="settings-label">Claude.ai (Web)</div>
      <div className="auth-row">
        <span className={`status-dot ${active?.hasClaudeWebKey ? 'status-connected' : 'status-error'}`} />
        <span className="auth-label">
          {active?.hasClaudeWebKey ? 'Session key stored' : authState?.method === 'claude-code' ? 'Claude Code (auto)' : 'Not connected'}
        </span>
      </div>
      <input
        type="password"
        className="wizard-input"
        placeholder="sk-ant-sid01-…"
        value={sessionKey}
        onChange={(e) => setSessionKey(e.target.value)}
      />
      {errS && <div className="wizard-error">{errS}</div>}
      <button className="settings-btn-secondary" onClick={saveSession} disabled={savingS || !sessionKey}>
        {savingS ? 'Validating…' : 'Save session key'}
      </button>

      <div className="tab-divider" />

      <div className="settings-label">Anthropic API Console</div>
      <div className="auth-row">
        <span className={`status-dot ${active?.hasAnthropicKey ? 'status-connected' : 'status-error'}`} />
        <span className="auth-label">
          {active?.hasAnthropicKey ? 'Admin key stored' : 'Not configured'}
        </span>
      </div>
      <input
        type="password"
        className="wizard-input"
        placeholder="sk-ant-admin01-…"
        value={adminKey}
        onChange={(e) => setAdminKey(e.target.value)}
      />
      {errA && <div className="wizard-error">{errA}</div>}
      <button className="settings-btn-secondary" onClick={saveAdmin} disabled={savingA || !adminKey}>
        {savingA ? 'Saving…' : 'Save admin key'}
      </button>
      <div className="tab-hint">
        Used only for the <code>usage_report</code> endpoints at api.anthropic.com.
        Encrypted with OS-level <code>safeStorage</code>.
      </div>

      <div className="tab-divider" />

      <div className="settings-label">Claude Code CLI</div>
      <div className="settings-value-muted">
        {authState?.method === 'claude-code' ? 'Detected at ~/.claude/credentials.json' : 'Not detected — install Claude Code to enable'}
      </div>
    </div>
  )
}
