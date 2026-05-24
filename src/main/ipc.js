const { shell, Notification, app } = require('electron')
const { detectCliCredentials } = require('./auth')
const schema = require('./store/schema')
const web = require('./sources/web')
const apiConsole = require('./sources/apiConsole')
const cli = require('./sources/cli')
const pairing = require('./pairing/server')

const EXPANDED_WIDTH = 300
const SETTINGS_WIDTH = 440
const EXPANDED_HEIGHT = 260
const MINI_WIDTH = 210
const MINI_HEIGHT = 48

const notified = { 75: false, 90: false, 100: false }

function fireNotifications(data) {
  const pcts = [data?.five_hour?.utilization_pct ?? 0, data?.seven_day?.utilization_pct ?? 0]
  const max = Math.max(...pcts)
  const msgs = {
    75: { title: 'Claude Usage — Heads up', body: '75% reached' },
    90: { title: 'Claude Usage — Almost there', body: '90% reached' },
    100: { title: 'Claude Usage — Limit reached', body: 'Usage limit reached.' },
  }
  for (const t of [100, 90, 75]) {
    if (max >= t && !notified[t]) {
      notified[t] = true
      if (Notification.isSupported()) new Notification(msgs[t]).show()
    }
  }
}

function getProfileKey(store, profile, field) {
  return schema.decrypt(profile?.[field])
}

function registerIpcHandlers(ipcMain, mainWindow, store) {
  schema.migrate(store)

  // ── Profiles ────────────────────────────────────────
  ipcMain.handle('profiles:list', () => {
    return {
      profiles: (store.get('profiles', []) || []).map(schema.publicProfile),
      activeId: store.get('activeProfileId'),
    }
  })

  ipcMain.handle('profiles:add', () => {
    const p = schema.addProfile(store)
    return schema.publicProfile(p)
  })

  ipcMain.handle('profiles:delete', (_e, id) => {
    schema.deleteProfile(store, id)
    return { ok: true }
  })

  ipcMain.handle('profiles:set-active', (_e, id) => {
    const p = schema.setActiveProfile(store, id)
    return schema.publicProfile(p)
  })

  ipcMain.handle('profiles:update', (_e, { id, patch }) => {
    // Encrypt sensitive fields before persisting.
    const safe = { ...patch }
    if ('claudeWebSessionKey' in safe) safe.claudeWebSessionKey = safe.claudeWebSessionKey ? schema.encrypt(safe.claudeWebSessionKey) : null
    if ('anthropicAdminKey'  in safe) safe.anthropicAdminKey  = safe.anthropicAdminKey  ? schema.encrypt(safe.anthropicAdminKey)  : null
    const p = schema.updateProfile(store, id, safe)
    return schema.publicProfile(p)
  })

  // ── Auth (legacy single-key flow kept for first-run wizard) ───
  ipcMain.handle('auth:detect-cli', () => detectCliCredentials())

  ipcMain.handle('auth:test-session-key', async (_e, key) => {
    try {
      const orgId = await web.fetchOrgId(key)
      return { valid: true, orgId }
    } catch (err) {
      return { valid: false, error: err.message }
    }
  })

  ipcMain.handle('auth:save-session-key', async (_e, key) => {
    try {
      const orgId = await web.fetchOrgId(key)
      const active = schema.getActiveProfile(store)
      if (active) {
        schema.updateProfile(store, active.id, {
          claudeWebSessionKey: schema.encrypt(key),
          claudeOrgId: orgId,
        })
      }
      return { ok: true }
    } catch (err) {
      return { ok: false, error: err.message }
    }
  })

  ipcMain.handle('auth:clear', () => {
    const active = schema.getActiveProfile(store)
    if (active) {
      schema.updateProfile(store, active.id, {
        claudeWebSessionKey: null,
        claudeOrgId: null,
      })
    }
    return { ok: true }
  })

  ipcMain.handle('auth:get-state', () => {
    const active = schema.getActiveProfile(store)
    if (active?.claudeWebSessionKey) return { method: 'session-key', connected: true }
    const cliCreds = detectCliCredentials()
    if (cliCreds.found) return { method: 'claude-code', connected: true }
    return { method: null, connected: false }
  })

  // ── Usage: web ──────────────────────────────────────
  ipcMain.handle('usage:fetch', async () => {
    try {
      const profile = schema.getActiveProfile(store)
      let key = schema.decrypt(profile?.claudeWebSessionKey)
      if (!key) {
        const cliCreds = detectCliCredentials()
        if (cliCreds.found) key = cliCreds.token
      }
      if (!key) return { error: 'NO_AUTH' }

      let orgId = profile?.claudeOrgId
      const isUUID = (v) => typeof v === 'string' && /^[0-9a-f-]{36}$/i.test(v)
      if (!orgId || !isUUID(orgId)) {
        orgId = await web.fetchOrgId(key)
        if (profile) schema.updateProfile(store, profile.id, { claudeOrgId: orgId })
      }
      const data = await web.fetchUsage(key, orgId)
      fireNotifications(data)
      const sessionPct = data?.five_hour?.utilization_pct ?? 0
      if (sessionPct < 10) Object.keys(notified).forEach((k) => (notified[k] = false))
      pairing.broadcast('web-usage', data)
      return { ok: true, data }
    } catch (err) {
      if (err.message === 'AUTH_EXPIRED') {
        mainWindow.webContents.send('auth:required')
        return { error: 'AUTH_EXPIRED' }
      }
      return { error: err.message }
    }
  })

  // ── Usage: API Console ──────────────────────────────
  ipcMain.handle('usage:fetch-api', async () => {
    try {
      const profile = schema.getActiveProfile(store)
      const key = schema.decrypt(profile?.anthropicAdminKey)
      if (!key) return { error: 'NO_ADMIN_KEY' }
      const data = await apiConsole.getUsage(key)
      pairing.broadcast('api-usage', data)
      return { ok: true, data }
    } catch (err) {
      return { error: err.message }
    }
  })

  ipcMain.handle('auth:save-admin-key', (_e, key) => {
    const profile = schema.getActiveProfile(store)
    if (!profile) return { ok: false, error: 'NO_PROFILE' }
    schema.updateProfile(store, profile.id, { anthropicAdminKey: schema.encrypt(key) })
    return { ok: true }
  })

  // ── Usage: CLI ──────────────────────────────────────
  ipcMain.handle('usage:fetch-cli', () => {
    try {
      const data = cli.getUsage()
      pairing.broadcast('cli-usage', data)
      return { ok: true, data }
    } catch (err) {
      return { error: err.message }
    }
  })

  // Start CLI watcher; push events to renderer
  cli.startWatch((data) => {
    mainWindow.webContents.send('usage:cli-update', data)
    pairing.broadcast('cli-usage', data)
  })

  // ── Pairing ─────────────────────────────────────────
  ipcMain.handle('pair:start', () => pairing.startServer())
  ipcMain.handle('pair:stop',  () => { pairing.stopServer(); return { ok: true } })
  ipcMain.handle('pair:info',  () => pairing.getPairingInfo())
  ipcMain.handle('pair:devices', () => pairing.getPairedDevices())
  ipcMain.handle('pair:revoke',  (_e, id) => { pairing.revokeDevice(id); return { ok: true } })

  // ── Settings ────────────────────────────────────────
  ipcMain.handle('settings:get', () => ({
    refreshInterval: store.get('refreshInterval', 60),
    autoStart: store.get('autoStart', false),
    opacity: store.get('opacity', 0.9),
    visibleRings: store.get('visibleRings', { session: true, weekly: true, design: true }),
    ringStyle: store.get('ringStyle', 'cards'),
    showRemaining: store.get('showRemaining', false),
    activeTab: store.get('activeTab', 'profile'),
    activeSource: store.get('activeSource', 'web'),
    alwaysOnTop: store.get('alwaysOnTop', true),
  }))

  ipcMain.handle('settings:save', (_e, settings) => {
    const keys = [
      'refreshInterval', 'autoStart', 'opacity', 'visibleRings',
      'ringStyle', 'showRemaining', 'activeTab', 'activeSource', 'alwaysOnTop',
    ]
    for (const k of keys) if (k in settings) store.set(k, settings[k])

    if ('autoStart' in settings) app.setLoginItemSettings({ openAtLogin: settings.autoStart })
    if ('opacity' in settings) mainWindow.setOpacity(settings.opacity)
    if ('alwaysOnTop' in settings) mainWindow.setAlwaysOnTop(!!settings.alwaysOnTop)
    return { ok: true }
  })

  // ── Window ──────────────────────────────────────────
  ipcMain.handle('window:set-height', (_e, height) => {
    const [x, y] = mainWindow.getPosition()
    const [w] = mainWindow.getSize()
    mainWindow.setSize(w, height)
    mainWindow.setPosition(x, y)
    return { ok: true }
  })

  ipcMain.handle('window:set-width', (_e, width) => {
    const [x, y] = mainWindow.getPosition()
    const [, h] = mainWindow.getSize()
    mainWindow.setSize(width, h)
    mainWindow.setPosition(x, y)
    return { ok: true }
  })

  ipcMain.handle('window:set-mini', (_e, mini) => {
    const [x, y] = mainWindow.getPosition()
    if (mini) mainWindow.setSize(MINI_WIDTH, MINI_HEIGHT)
    else mainWindow.setSize(EXPANDED_WIDTH, EXPANDED_HEIGHT)
    mainWindow.setPosition(x, y)
    return { ok: true }
  })

  ipcMain.handle('window:toggle-mini', () => {
    const [w] = mainWindow.getSize()
    const goingMini = w !== MINI_WIDTH
    const [x, y] = mainWindow.getPosition()
    if (goingMini) mainWindow.setSize(MINI_WIDTH, MINI_HEIGHT)
    else mainWindow.setSize(EXPANDED_WIDTH, EXPANDED_HEIGHT)
    mainWindow.setPosition(x, y)
    mainWindow.webContents.send('window:mini-changed', goingMini)
    return { ok: true, mini: goingMini }
  })

  ipcMain.handle('window:close', () => { mainWindow.hide(); return { ok: true } })

  // ── Shell ───────────────────────────────────────────
  ipcMain.handle('shell:open-external', (_e, url) => {
    const allowed = ['https://github.com', 'https://claude.ai', 'https://console.anthropic.com']
    if (allowed.some((a) => url.startsWith(a))) shell.openExternal(url)
    return { ok: true }
  })
}

module.exports = { registerIpcHandlers }
