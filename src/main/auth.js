const fs = require('fs')
const path = require('path')
const os = require('os')
const { safeStorage } = require('electron')

const CRED_PATHS = [
  path.join(os.homedir(), '.claude', 'credentials.json'),
  path.join(os.homedir(), '.claude', '.credentials.json'),
]

function detectCliCredentials() {
  for (const credPath of CRED_PATHS) {
    try {
      if (!fs.existsSync(credPath)) continue
      const raw = fs.readFileSync(credPath, 'utf-8')
      const data = JSON.parse(raw)

      const token =
        data.access_token ||
        data.session_key ||
        data.claudeAiOauthClientId ||
        (data.oauth_token && data.oauth_token.access_token)

      if (token) {
        return { found: true, token, source: 'claude-code', path: credPath }
      }
    } catch {
      // try next path
    }
  }
  return { found: false }
}

const STORAGE_KEY = 'encrypted_session_key'

function getStoredSessionKey(store) {
  try {
    const encrypted = store.get(STORAGE_KEY)
    if (!encrypted) return null
    if (safeStorage.isEncryptionAvailable()) {
      return safeStorage.decryptString(Buffer.from(encrypted, 'base64'))
    }
    // Fallback: plain (dev only)
    return Buffer.from(encrypted, 'base64').toString('utf-8')
  } catch {
    return null
  }
}

function storeSessionKey(store, key) {
  try {
    let encrypted
    if (safeStorage.isEncryptionAvailable()) {
      encrypted = safeStorage.encryptString(key).toString('base64')
    } else {
      encrypted = Buffer.from(key, 'utf-8').toString('base64')
    }
    store.set(STORAGE_KEY, encrypted)
    store.set('auth_method', 'session-key')
    return true
  } catch {
    return false
  }
}

function clearCredentials(store) {
  store.delete(STORAGE_KEY)
  store.delete('auth_method')
  store.delete('org_id')
}

module.exports = {
  detectCliCredentials,
  getStoredSessionKey,
  storeSessionKey,
  clearCredentials,
}
