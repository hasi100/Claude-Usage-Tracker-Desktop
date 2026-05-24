import { useState, useEffect, useCallback, useRef } from 'react'
import UsageCard from './components/UsageCard'
import RingChart from './components/RingChart'
import MiniPill from './components/MiniPill'
import Settings from './components/Settings/index.jsx'
import AuthWizard from './components/AuthWizard'
import Insights from './components/Insights'
import ApiUsageCard from './components/ApiUsageCard'
import CliUsageCard from './components/CliUsageCard'
import SourceSwitcher from './components/SourceSwitcher'
import ProfileDropdown from './components/ProfileDropdown'
import { useUsageData } from './hooks/useUsageData'
import { useAuth } from './hooks/useAuth'
import { useProfile } from './hooks/useProfile'

export default function App() {
  const [isMini, setIsMini] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [displaySettings, setDisplaySettings] = useState({
    visibleRings: { session: true, weekly: true, design: true },
    ringStyle: 'cards',
    showRemaining: false,
    refreshInterval: 60,
    alwaysOnTop: true,
  })
  const [activeSource, setActiveSource] = useState('web')
  const shellRef = useRef(null)

  const { authState, setAuthState } = useAuth()
  const { usage, isLoading, forceRefresh } = useUsageData(authState)
  const { active: activeProfile } = useProfile()
  const isAuthenticated = authState?.connected
  const sources = activeProfile?.sources ?? { web: true, api: false, cli: false }

  useEffect(() => {
    window.electronAPI?.getSettings?.().then((s) => {
      if (!s) return
      setDisplaySettings((prev) => ({
        ...prev,
        visibleRings:    s.visibleRings ?? prev.visibleRings,
        ringStyle:       s.ringStyle ?? prev.ringStyle,
        showRemaining:   s.showRemaining ?? false,
        refreshInterval: s.refreshInterval ?? 60,
        alwaysOnTop:     s.alwaysOnTop ?? true,
      }))
      if (s.activeSource) setActiveSource(s.activeSource)
      document.documentElement.setAttribute('data-theme', 'dark')
    })
  }, [])

  useEffect(() => {
    if (isMini) return
    const targetW = showSettings ? 440 : 300
    window.electronAPI?.setWindowWidth?.(targetW)
  }, [isMini, showSettings])

  useEffect(() => {
    if (!shellRef.current || isMini) return
    const el = shellRef.current
    const apply = () => {
      const h = el.scrollHeight
      if (h && h > 0) window.electronAPI?.setWindowHeight?.(h)
    }
    const ro = new ResizeObserver(apply)
    ro.observe(el)
    apply()
    return () => ro.disconnect()
  }, [isMini, showSettings])

  const toggleMini = useCallback(() => {
    const next = !isMini
    setIsMini(next)
    window.electronAPI?.setMiniMode(next)
  }, [isMini])

  // Global shortcut + tray-triggered toggle
  useEffect(() => {
    const off = window.electronAPI?.onMiniChanged?.((mini) => setIsMini(mini))
    return () => off?.()
  }, [])

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true)
    await forceRefresh()
    setTimeout(() => setIsRefreshing(false), 800)
  }, [forceRefresh])

  const changeSource = (s) => {
    setActiveSource(s)
    window.electronAPI?.saveSettings?.({ activeSource: s })
  }

  useEffect(() => {
    const off = window.electronAPI?.onAuthRequired?.(() =>
      setAuthState((s) => ({ ...s, connected: false, method: null })),
    )
    return () => off?.()
  }, [setAuthState])

  if (authState === null) return null

  if (!isAuthenticated) {
    return (
      <div className="app-shell" ref={shellRef}>
        <AuthWizard onAuth={(state) => setAuthState(state)} />
      </div>
    )
  }

  if (isMini) {
    return (
      <div className="app-shell-mini" onDoubleClick={toggleMini}>
        <MiniPill usage={usage} onExpand={toggleMini} />
      </div>
    )
  }

  if (showSettings) {
    return (
      <div className="app-shell" ref={shellRef}>
        <Settings
          onClose={() => setShowSettings(false)}
          authState={authState}
          onReauth={() => {
            setShowSettings(false)
            setAuthState((s) => ({ ...s, connected: false, method: null }))
          }}
          onSettingsChange={(s) => setDisplaySettings((prev) => ({ ...prev, ...s }))}
        />
      </div>
    )
  }

  const vis = displaySettings.visibleRings
  const style = displaySettings.ringStyle
  const showRemaining = displaySettings.showRemaining

  const webMetrics = [
    vis.session && { key: 'session', title: 'Session', tag: '5h window', pct: usage?.session ?? 0, resetAt: usage?.sessionReset, windowHours: 5 },
    vis.weekly  && { key: 'weekly',  title: 'All Models', tag: 'Weekly', pct: usage?.weekly  ?? 0, resetAt: usage?.weeklyReset, windowHours: 168 },
    vis.design  && { key: 'design',  title: 'Design Usage', tag: 'Weekly', pct: usage?.design  ?? 0, resetAt: usage?.designReset, windowHours: 168 },
  ].filter(Boolean)

  const renderWeb = () => (
    style === 'rings' ? (
      <div className="rings-row">
        {webMetrics.map((m) => (
          <RingChart key={m.key} label={m.title} pct={m.pct} resetAt={m.resetAt} loading={isLoading} />
        ))}
      </div>
    ) : (
      <div className="cards-col">
        {webMetrics.map((m) => (
          <UsageCard
            key={m.key}
            title={m.title} tag={m.tag} pct={m.pct}
            resetAt={m.resetAt} windowHours={m.windowHours}
            loading={isLoading} showRemaining={showRemaining}
          />
        ))}
      </div>
    )
  )

  return (
    <div className="app-shell" ref={shellRef}>
      <div className="title-bar drag-region">
        <div className="title-bar-left">
          <ProfileDropdown />
        </div>
        <div className="title-bar-right no-drag">
          <button
            className={`ctrl-btn ${isRefreshing ? 'spinning' : ''}`}
            onClick={handleRefresh} title="Refresh" disabled={isRefreshing}
          >↻</button>
          <button className="ctrl-btn" onClick={toggleMini} title="Minimize (Ctrl+Shift+M)">─</button>
          <button className="ctrl-btn" onClick={() => setShowSettings(true)} title="Settings">⚙</button>
          <button className="ctrl-btn ctrl-btn-close" onClick={() => window.electronAPI?.closeWindow()} title="Close">×</button>
        </div>
      </div>

      <SourceSwitcher active={activeSource} onChange={changeSource} enabled={sources} />

      <div className="metrics-area">
        {activeSource === 'web' && renderWeb()}
        {activeSource === 'api' && <div className="cards-col"><ApiUsageCard refreshInterval={displaySettings.refreshInterval} /></div>}
        {activeSource === 'cli' && <div className="cards-col"><CliUsageCard /></div>}
        {activeSource === 'all' && (
          <div className="cards-col">
            {sources.web && renderWeb()}
            {sources.api && <ApiUsageCard refreshInterval={displaySettings.refreshInterval} />}
            {sources.cli && <CliUsageCard />}
          </div>
        )}
      </div>

      {!isLoading && usage && activeSource !== 'api' && activeSource !== 'cli' && <Insights usage={usage} />}

      <div className="status-bar no-drag">
        <span className={`status-dot ${isAuthenticated ? 'status-connected' : 'status-error'}`} />
        <span className="status-text">
          {authState?.method === 'claude-code' ? 'Claude Code'
            : authState?.method === 'session-key' ? 'Session Key'
            : 'Not connected'}
        </span>
        <span className="status-spacer" />
        {usage && <span className="status-updated">Updated just now</span>}
      </div>
    </div>
  )
}
