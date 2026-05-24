const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('electronAPI', {
  // Profiles
  listProfiles:    ()      => ipcRenderer.invoke('profiles:list'),
  addProfile:      ()      => ipcRenderer.invoke('profiles:add'),
  deleteProfile:   (id)    => ipcRenderer.invoke('profiles:delete', id),
  setActiveProfile:(id)    => ipcRenderer.invoke('profiles:set-active', id),
  updateProfile:   (id, patch) => ipcRenderer.invoke('profiles:update', { id, patch }),

  // Auth (legacy single-key)
  detectCliAuth:    ()    => ipcRenderer.invoke('auth:detect-cli'),
  testSessionKey:   (k)   => ipcRenderer.invoke('auth:test-session-key', k),
  saveSessionKey:   (k)   => ipcRenderer.invoke('auth:save-session-key', k),
  saveAdminKey:     (k)   => ipcRenderer.invoke('auth:save-admin-key', k),
  clearAuth:        ()    => ipcRenderer.invoke('auth:clear'),
  getAuthState:     ()    => ipcRenderer.invoke('auth:get-state'),

  // Usage
  fetchUsage:       ()    => ipcRenderer.invoke('usage:fetch'),
  fetchApiUsage:    ()    => ipcRenderer.invoke('usage:fetch-api'),
  fetchCliUsage:    ()    => ipcRenderer.invoke('usage:fetch-cli'),

  // Pairing
  pairStart:   ()    => ipcRenderer.invoke('pair:start'),
  pairStop:    ()    => ipcRenderer.invoke('pair:stop'),
  pairInfo:    ()    => ipcRenderer.invoke('pair:info'),
  pairDevices: ()    => ipcRenderer.invoke('pair:devices'),
  pairRevoke:  (id)  => ipcRenderer.invoke('pair:revoke', id),

  // Settings
  getSettings:  ()        => ipcRenderer.invoke('settings:get'),
  saveSettings: (settings)=> ipcRenderer.invoke('settings:save', settings),

  // Window
  setMiniMode:     (m) => ipcRenderer.invoke('window:set-mini', m),
  toggleMini:      ()  => ipcRenderer.invoke('window:toggle-mini'),
  setWindowHeight: (h) => ipcRenderer.invoke('window:set-height', h),
  setWindowWidth:  (w) => ipcRenderer.invoke('window:set-width', w),
  closeWindow:     ()  => ipcRenderer.invoke('window:close'),
  openExternal:    (u) => ipcRenderer.invoke('shell:open-external', u),

  // Events from main
  onUsageUpdate: (cb) => {
    ipcRenderer.on('usage:update', (_e, data) => cb(data))
    return () => ipcRenderer.removeAllListeners('usage:update')
  },
  onCliUpdate: (cb) => {
    ipcRenderer.on('usage:cli-update', (_e, data) => cb(data))
    return () => ipcRenderer.removeAllListeners('usage:cli-update')
  },
  onAuthRequired: (cb) => {
    ipcRenderer.on('auth:required', (_e) => cb())
    return () => ipcRenderer.removeAllListeners('auth:required')
  },
  onMiniChanged: (cb) => {
    ipcRenderer.on('window:mini-changed', (_e, mini) => cb(mini))
    return () => ipcRenderer.removeAllListeners('window:mini-changed')
  },
})
