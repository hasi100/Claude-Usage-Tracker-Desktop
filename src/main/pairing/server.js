// Local HTTPS server for mobile pairing + encrypted SSE stream of usage events.
// Lifetime is tied to the pairing flow: started when user clicks "Pair Mobile",
// stopped when no clients are connected and no pending pairings remain.

const https = require('https')
const os = require('os')
const { getOrCreate } = require('./cert')
const { genKeypair, toB64, encrypt, randomToken } = require('./crypto')

let server = null
let serverKeypair = null
let pendingToken = null
let pendingExpires = 0
let pairedDevices = []  // { id, pubkey, name, lastSeen }
let clients = []        // { res, devicePub }
let portInUse = 0

function lanIp() {
  const ifs = os.networkInterfaces()
  for (const name of Object.keys(ifs)) {
    for (const i of ifs[name]) {
      if (i.family === 'IPv4' && !i.internal) return i.address
    }
  }
  return '127.0.0.1'
}

function startServer() {
  if (server) return getPairingInfo()

  const { cert, key, fingerprint } = getOrCreate()
  serverKeypair = genKeypair()
  pendingToken = randomToken()
  pendingExpires = Date.now() + 120_000

  server = https.createServer({ cert, key }, handleRequest)
  server.listen(0, '0.0.0.0', () => {
    portInUse = server.address().port
  })

  return getPairingInfo()
}

function stopServer() {
  if (!server) return
  clients.forEach((c) => { try { c.res.end() } catch {} })
  clients = []
  server.close()
  server = null
  serverKeypair = null
  pendingToken = null
}

function getPairingInfo() {
  const { fingerprint } = getOrCreate()
  return {
    v: 1,
    host: lanIp(),
    port: portInUse,
    fp: fingerprint,
    token: pendingToken,
    pubkey: serverKeypair ? toB64(serverKeypair.publicKey) : null,
    ttl: Math.max(0, Math.floor((pendingExpires - Date.now()) / 1000)),
  }
}

function getPairedDevices() {
  return pairedDevices.map(({ id, name, lastSeen }) => ({ id, name, lastSeen }))
}

function revokeDevice(id) {
  pairedDevices = pairedDevices.filter((d) => d.id !== id)
  clients = clients.filter((c) => {
    if (c.deviceId === id) { try { c.res.end() } catch {} return false }
    return true
  })
}

function broadcast(event, data) {
  if (!server || !serverKeypair) return
  for (const c of clients) {
    const payload = encrypt({ event, data, t: Date.now() }, c.devicePub, serverKeypair.secretKey)
    try {
      c.res.write(`data: ${JSON.stringify(payload)}\n\n`)
    } catch { /* client gone */ }
  }
}

function readJson(req) {
  return new Promise((resolve, reject) => {
    const chunks = []
    req.on('data', (c) => chunks.push(c))
    req.on('end', () => {
      try { resolve(JSON.parse(Buffer.concat(chunks).toString('utf-8'))) }
      catch (e) { reject(e) }
    })
    req.on('error', reject)
  })
}

function cors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization')
}

async function handleRequest(req, res) {
  cors(res)
  if (req.method === 'OPTIONS') return res.writeHead(204).end()

  if (req.url === '/pair' && req.method === 'POST') {
    try {
      const body = await readJson(req)
      if (!pendingToken || body.token !== pendingToken) {
        return res.writeHead(401).end(JSON.stringify({ error: 'INVALID_TOKEN' }))
      }
      if (Date.now() > pendingExpires) {
        return res.writeHead(401).end(JSON.stringify({ error: 'EXPIRED' }))
      }
      const device = {
        id: randomToken(),
        pubkey: body.pubkey,
        name: body.name ?? 'Mobile',
        lastSeen: Date.now(),
      }
      pairedDevices.push(device)
      pendingToken = null  // one-time use
      res.setHeader('Content-Type', 'application/json')
      res.end(JSON.stringify({ ok: true, deviceId: device.id }))
    } catch (e) {
      res.writeHead(400).end(JSON.stringify({ error: e.message }))
    }
    return
  }

  if (req.url?.startsWith('/stream') && req.method === 'GET') {
    const auth = req.headers.authorization?.replace(/^Bearer\s+/, '')
    const device = pairedDevices.find((d) => d.id === auth)
    if (!device) return res.writeHead(401).end()

    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    })
    const client = { res, devicePub: device.pubkey, deviceId: device.id }
    clients.push(client)

    req.on('close', () => {
      clients = clients.filter((c) => c !== client)
    })
    // initial hello
    const hello = encrypt({ event: 'hello', t: Date.now() }, device.pubkey, serverKeypair.secretKey)
    res.write(`data: ${JSON.stringify(hello)}\n\n`)
    return
  }

  res.writeHead(404).end()
}

module.exports = {
  startServer,
  stopServer,
  getPairingInfo,
  getPairedDevices,
  revokeDevice,
  broadcast,
}
