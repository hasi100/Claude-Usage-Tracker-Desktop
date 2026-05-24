// claude.ai web usage — extracted from inline ipc.js logic.
const { net } = require('electron')

function get(url, headers) {
  return new Promise((resolve, reject) => {
    const req = net.request({ url, method: 'GET' })
    Object.entries(headers).forEach(([k, v]) => req.setHeader(k, v))
    req.on('response', (res) => {
      const chunks = []
      res.on('data', (c) => chunks.push(c))
      res.on('end', () => {
        const body = Buffer.concat(chunks).toString('utf-8')
        try { resolve({ status: res.statusCode, data: JSON.parse(body) }) }
        catch { resolve({ status: res.statusCode, data: body }) }
      })
    })
    req.on('error', reject)
    req.end()
  })
}

function headers(sessionKey) {
  return {
    Cookie: `sessionKey=${sessionKey}`,
    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15',
    Accept: 'application/json',
    'Content-Type': 'application/json',
    Referer: 'https://claude.ai',
    Origin: 'https://claude.ai',
  }
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

async function fetchOrgId(sessionKey) {
  const res = await get('https://claude.ai/api/organizations', headers(sessionKey))
  if (res.status !== 200) throw new Error(`HTTP ${res.status}`)
  const orgs = Array.isArray(res.data) ? res.data : res.data.organizations
  if (!orgs || orgs.length === 0) throw new Error('No organizations found')
  const uuid = orgs[0].uuid || orgs[0].organization_uuid
  if (!uuid || !UUID_RE.test(uuid)) throw new Error('Invalid org uuid')
  return uuid
}

async function fetchUsage(sessionKey, orgId) {
  const url = `https://claude.ai/api/organizations/${orgId}/usage`
  const res = await get(url, headers(sessionKey))
  if (res.status === 401 || res.status === 403) throw new Error('AUTH_EXPIRED')
  if (res.status !== 200) throw new Error(`HTTP ${res.status}`)
  return res.data
}

module.exports = { fetchOrgId, fetchUsage }
