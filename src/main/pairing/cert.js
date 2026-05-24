// Self-signed TLS cert generated once on first pairing and persisted to disk.
// The mobile app pins this cert via the fingerprint embedded in the QR.
const path = require('path')
const fs = require('fs')
const selfsigned = require('selfsigned')
const crypto = require('crypto')

let _userDataDir = null
function getUserData() {
  if (_userDataDir) return _userDataDir
  _userDataDir = require('electron').app.getPath('userData')
  return _userDataDir
}
function setUserData(p) { _userDataDir = p }  // testing seam

function certPath() {
  return path.join(getUserData(), 'pairing-cert.json')
}

function fingerprint(certPem) {
  // SHA-256 of DER, lowercase hex.
  const der = Buffer.from(
    certPem
      .replace('-----BEGIN CERTIFICATE-----', '')
      .replace('-----END CERTIFICATE-----', '')
      .replace(/\s+/g, ''),
    'base64',
  )
  return crypto.createHash('sha256').update(der).digest('hex')
}

function load() {
  const p = certPath()
  if (!fs.existsSync(p)) return null
  try { return JSON.parse(fs.readFileSync(p, 'utf-8')) } catch { return null }
}

function getOrCreate() {
  const cached = load()
  if (cached) return cached
  const pems = selfsigned.generate(
    [{ name: 'commonName', value: 'claude-usage-tracker.local' }],
    { days: 3650, keySize: 2048, algorithm: 'sha256' },
  )
  const out = {
    cert: pems.cert,
    key: pems.private,
    fingerprint: fingerprint(pems.cert),
  }
  fs.writeFileSync(certPath(), JSON.stringify(out), 'utf-8')
  return out
}

module.exports = { getOrCreate, setUserData }
