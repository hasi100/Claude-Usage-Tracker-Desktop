import { useState, useEffect, useCallback } from 'react'
import SettingsSidebar from './SettingsSidebar'
import ProfileTab from './tabs/Profile'
import AuthTab from './tabs/Auth'
import SourcesTab from './tabs/Sources'
import DisplayTab from './tabs/Display'
import MobileTab from './tabs/Mobile'
import GeneralTab from './tabs/General'

const DEFAULTS = {
  refreshInterval: 60,
  autoStart: false,
  opacity: 0.9,
  visibleRings: { session: true, weekly: true, design: true },
  ringStyle: 'cards',
  showRemaining: false,
  activeTab: 'profile',
  sources: { web: true, api: false, cli: false },
}

const TABS = {
  profile:  { Component: ProfileTab,  label: 'Profile'  },
  auth:     { Component: AuthTab,     label: 'Auth'     },
  sources:  { Component: SourcesTab,  label: 'Sources'  },
  display:  { Component: DisplayTab,  label: 'Display'  },
  mobile:   { Component: MobileTab,   label: 'Mobile'   },
  general:  { Component: GeneralTab,  label: 'General'  },
}

export default function Settings({ onClose, authState, onReauth, onSettingsChange }) {
  const [settings, setSettings] = useState(DEFAULTS)
  const [activeTab, setActiveTab] = useState('profile')
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    window.electronAPI?.getSettings?.().then((s) => {
      if (s) setSettings((prev) => ({ ...prev, ...s }))
      if (s?.activeTab && TABS[s.activeTab]) setActiveTab(s.activeTab)
      setLoaded(true)
    })
  }, [])

  // Persist + propagate any settings change immediately.
  const patch = useCallback((delta) => {
    setSettings((prev) => {
      const next = { ...prev, ...delta }
      window.electronAPI?.saveSettings?.(delta)
      onSettingsChange?.(next)
      return next
    })
  }, [onSettingsChange])

  const handleTabChange = (id) => {
    setActiveTab(id)
    window.electronAPI?.saveSettings?.({ activeTab: id })
  }

  if (!loaded) return <div className="settings-shell" />

  const Active = TABS[activeTab].Component

  return (
    <div className="settings-shell no-drag">
      <SettingsSidebar
        active={activeTab}
        onChange={handleTabChange}
        onClose={onClose}
      />
      <div className="settings-content">
        <Active
          settings={settings}
          patch={patch}
          authState={authState}
          onReauth={onReauth}
        />
      </div>
    </div>
  )
}
