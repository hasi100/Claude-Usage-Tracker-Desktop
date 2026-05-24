// Multi-profile store schema + migrations.
// Each profile owns its own credentials and source toggles.

const { v4: uuid } = require('uuid')
const { safeStorage } = require('electron')

const FUN_NAMES = ['Falcon', 'Otter', 'Lynx', 'Heron', 'Sable', 'Wren', 'Marlin', 'Vireo']
const FUN_ADJ   = ['Quiet', 'Swift', 'Bold', 'Calm', 'Lone', 'Bright', 'Slow', 'Sharp']
const COLORS    = ['#F65D1F', '#10b981', '#3b82f6', '#a855f7', '#ec4899', '#eab308']

function autoName(existing = []) {
  for (let i = 0; i < 50; i++) {
    const n = `${FUN_ADJ[Math.random() * FUN_ADJ.length | 0]} ${FUN_NAMES[Math.random() * FUN_NAMES.length | 0]}`
    if (!existing.find((p) => p.name === n)) return n
  }
  return `Profile ${existing.length + 1}`
}

function autoColor(existing = []) {
  const used = new Set(existing.map((p) => p.color))
  return COLORS.find((c) => !used.has(c)) ?? COLORS[existing.length % COLORS.length]
}

function emptyProfile(existing = []) {
  return {
    id: uuid(),
    name: autoName(existing),
    color: autoColor(existing),
    claudeWebSessionKey: null,    // encrypted buffer (base64)
    claudeOrgId: null,
    anthropicAdminKey: null,      // encrypted buffer (base64)
    anthropicOrgId: null,
    sources: { web: true, api: false, cli: false },
  }
}

function encrypt(plain) {
  if (!plain) return null
  if (!safeStorage.isEncryptionAvailable()) return plain // fallback: plaintext
  return safeStorage.encryptString(plain).toString('base64')
}

function decrypt(enc) {
  if (!enc) return null
  if (typeof enc !== 'string') return null
  if (!safeStorage.isEncryptionAvailable()) return enc
  try {
    return safeStorage.decryptString(Buffer.from(enc, 'base64'))
  } catch {
    return null
  }
}

/**
 * Run on app start. If `profiles` doesn't exist, wrap legacy single-profile
 * config into profiles[0].
 */
function migrate(store) {
  if (store.get('profiles')) return

  const legacyKey = store.get('claude_session_key') // already-encrypted
  const legacyOrg = store.get('org_id')
  const legacyMethod = store.get('auth_method')

  const p = emptyProfile([])
  p.name = 'Default'
  if (legacyKey) p.claudeWebSessionKey = legacyKey
  if (legacyOrg) p.claudeOrgId = legacyOrg
  if (legacyMethod === 'session-key' || legacyMethod === 'claude-code') {
    p.sources = { web: true, api: false, cli: false }
  }

  store.set('profiles', [p])
  store.set('activeProfileId', p.id)
}

function getActiveProfile(store) {
  const profiles = store.get('profiles', [])
  const activeId = store.get('activeProfileId')
  return profiles.find((p) => p.id === activeId) ?? profiles[0] ?? null
}

function updateProfile(store, id, patch) {
  const profiles = store.get('profiles', []).map((p) => (p.id === id ? { ...p, ...patch } : p))
  store.set('profiles', profiles)
  return profiles.find((p) => p.id === id)
}

function addProfile(store) {
  const profiles = store.get('profiles', [])
  const p = emptyProfile(profiles)
  store.set('profiles', [...profiles, p])
  return p
}

function deleteProfile(store, id) {
  const profiles = store.get('profiles', []).filter((p) => p.id !== id)
  if (profiles.length === 0) {
    const fallback = emptyProfile([])
    fallback.name = 'Default'
    profiles.push(fallback)
  }
  store.set('profiles', profiles)
  if (store.get('activeProfileId') === id) store.set('activeProfileId', profiles[0].id)
  return profiles
}

function setActiveProfile(store, id) {
  const profiles = store.get('profiles', [])
  if (!profiles.find((p) => p.id === id)) return null
  store.set('activeProfileId', id)
  return getActiveProfile(store)
}

// Sanitise a profile before sending to the renderer (strip encrypted blobs).
function publicProfile(p) {
  if (!p) return null
  return {
    id: p.id,
    name: p.name,
    color: p.color,
    claudeOrgId: p.claudeOrgId,
    anthropicOrgId: p.anthropicOrgId,
    sources: p.sources,
    hasClaudeWebKey: !!p.claudeWebSessionKey,
    hasAnthropicKey: !!p.anthropicAdminKey,
  }
}

module.exports = {
  migrate,
  getActiveProfile,
  addProfile,
  deleteProfile,
  updateProfile,
  setActiveProfile,
  publicProfile,
  encrypt,
  decrypt,
}
