import { useState } from 'react'

export default function AuthWizard({ onAuth }) {
  const [step, setStep] = useState('choose') // choose | session-key | detecting
  const [sessionKey, setSessionKey] = useState('')
  const [error, setError] = useState('')
  const [testing, setTesting] = useState(false)

  const handleAutoDetect = async () => {
    setStep('detecting')
    setError('')
    const result = await window.electronAPI?.detectCliAuth?.()
    if (result?.found) {
      onAuth({ method: 'claude-code', connected: true })
    } else {
      setError('Claude Code credentials not found. Try entering a session key.')
      setStep('choose')
    }
  }

  const handleTestKey = async () => {
    if (!sessionKey.trim()) return
    setTesting(true)
    setError('')
    const result = await window.electronAPI?.saveSessionKey?.(sessionKey.trim())
    setTesting(false)
    if (result?.ok) {
      onAuth({ method: 'session-key', connected: true })
    } else {
      setError(result?.error || 'Connection failed. Check your session key.')
    }
  }

  return (
    <div className="wizard">
      <div className="wizard-header drag-region">
        <span className="dot dot-red" />
        <span className="dot dot-yellow" />
        <span className="dot dot-green" />
        <span className="wizard-title">Claude Usage Tracker</span>
      </div>

      {step === 'detecting' ? (
        <div className="wizard-body">
          <div className="wizard-spinner" />
          <p className="wizard-hint">Detecting Claude Code credentials…</p>
        </div>
      ) : step === 'choose' ? (
        <div className="wizard-body">
          <p className="wizard-subtitle">Connect to your Claude account</p>
          <button className="wizard-btn-primary" onClick={handleAutoDetect}>
            ⚡ Auto-detect Claude Code
          </button>
          <button className="wizard-btn-secondary" onClick={() => setStep('session-key')}>
            🔑 Enter Session Key
          </button>
          {error && <p className="wizard-error">{error}</p>}
        </div>
      ) : (
        <div className="wizard-body">
          <p className="wizard-subtitle">Paste your Claude session key</p>
          <ol className="wizard-steps">
            <li>Open <strong>claude.ai</strong> in your browser</li>
            <li>Press <strong>F12</strong> → Application tab</li>
            <li>Cookies → claude.ai → copy <code>sessionKey</code></li>
          </ol>
          <input
            className="wizard-input"
            type="password"
            placeholder="sk-ant-sid01-..."
            value={sessionKey}
            onChange={(e) => setSessionKey(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleTestKey()}
          />
          {error && <p className="wizard-error">{error}</p>}
          <div className="wizard-actions">
            <button className="wizard-btn-ghost" onClick={() => setStep('choose')}>← Back</button>
            <button className="wizard-btn-primary" onClick={handleTestKey} disabled={testing || !sessionKey}>
              {testing ? 'Testing…' : 'Connect'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
