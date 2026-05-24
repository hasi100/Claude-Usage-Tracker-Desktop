import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import fs from 'fs'
import os from 'os'
import path from 'path'
import https from 'https'

import * as server from '../../src/main/pairing/server.js'
import * as cryptoMod from '../../src/main/pairing/crypto.js'

let tmpUserData
beforeEach(() => {
  tmpUserData = fs.mkdtempSync(path.join(os.tmpdir(), 'cut-int-'))
  server._setUserDataForTest(tmpUserData)
})
afterEach(() => {
  fs.rmSync(tmpUserData, { recursive: true, force: true })
})

function post(host, port, body) {
  return new Promise((resolve, reject) => {
    const req = https.request(
      { host, port, path: '/pair', method: 'POST', headers: { 'Content-Type': 'application/json' }, rejectUnauthorized: false },
      (res) => {
        const chunks = []
        res.on('data', (c) => chunks.push(c))
        res.on('end', () => resolve({ status: res.statusCode, body: JSON.parse(Buffer.concat(chunks).toString()) }))
      },
    )
    req.on('error', reject)
    req.write(JSON.stringify(body))
    req.end()
  })
}

describe('pairing — desktop ⇄ phone integration', () => {
  it('full handshake → encrypted broadcast → mobile decrypt', async () => {
    const phone = cryptoMod.genKeypair()
    const info = await server.startServer()
    expect(info.token).toBeTruthy()
    expect(info.pubkey).toBeTruthy()

    try {
      const pair = await post('127.0.0.1', info.port, {
        token: info.token,
        pubkey: cryptoMod.toB64(phone.publicKey),
        name: 'Test Phone',
      })
      expect(pair.body.ok).toBe(true)

      const events = []
      await new Promise((resolve, reject) => {
        const req = https.request(
          { host: '127.0.0.1', port: info.port, path: '/stream', method: 'GET',
            headers: { Authorization: `Bearer ${pair.body.deviceId}` }, rejectUnauthorized: false },
          (res) => {
            res.on('data', (chunk) => {
              const text = chunk.toString('utf-8')
              for (const line of text.split('\n')) {
                if (!line.startsWith('data: ')) continue
                const payload = JSON.parse(line.slice(6))
                const plain = cryptoMod.decrypt(payload, info.pubkey, phone.secretKey)
                if (plain) {
                  events.push(plain)
                  if (events.length === 2) { res.destroy(); resolve() }
                }
              }
            })
            res.on('error', reject)
          },
        )
        req.on('error', reject)
        req.end()
        setTimeout(() => server.broadcast('web-usage', { five_hour: { utilization: 0.5 } }), 150)
      })

      const hello = events.find((e) => e.event === 'hello')
      const usage = events.find((e) => e.event === 'web-usage')
      expect(hello).toBeTruthy()
      expect(usage.data.five_hour.utilization).toBe(0.5)
    } finally {
      server.stopServer()
    }
  }, 10_000)
})
