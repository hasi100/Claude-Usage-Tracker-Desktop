import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import fs from 'fs'
import os from 'os'
import path from 'path'
import https from 'https'

import * as server from '../../src/main/pairing/server.js'

let tmpUserData
beforeEach(() => {
  tmpUserData = fs.mkdtempSync(path.join(os.tmpdir(), 'cut-pair-'))
  server._setUserDataForTest(tmpUserData)
})
afterEach(() => {
  fs.rmSync(tmpUserData, { recursive: true, force: true })
})

function postJson(host, port, body) {
  return new Promise((resolve, reject) => {
    const req = https.request(
      { host, port, path: '/pair', method: 'POST', headers: { 'Content-Type': 'application/json' }, rejectUnauthorized: false },
      (res) => {
        const chunks = []
        res.on('data', (c) => chunks.push(c))
        res.on('end', () => {
          const t = Buffer.concat(chunks).toString('utf-8')
          try { resolve({ status: res.statusCode, body: JSON.parse(t) }) }
          catch { resolve({ status: res.statusCode, body: t }) }
        })
      },
    )
    req.on('error', reject)
    req.write(JSON.stringify(body))
    req.end()
  })
}

describe('pairing/server', () => {
  it('rejects pair POST with wrong token', async () => {
    const info = await server.startServer()
    try {
      const r = await postJson('127.0.0.1', info.port, { token: 'wrong', pubkey: 'AAAA', name: 'evil' })
      expect(r.status).toBe(401)
      expect(r.body.error).toBe('INVALID_TOKEN')
    } finally { server.stopServer() }
  })

  it('accepts pair POST with the correct token and returns a deviceId', async () => {
    const info = await server.startServer()
    try {
      const r = await postJson('127.0.0.1', info.port, { token: info.token, pubkey: 'pkBASE64', name: 'iPhone' })
      expect(r.status).toBe(200)
      expect(r.body.ok).toBe(true)
      expect(typeof r.body.deviceId).toBe('string')
      expect(server.getPairedDevices()).toHaveLength(1)
      expect(server.getPairedDevices()[0].name).toBe('iPhone')
    } finally { server.stopServer() }
  })

  it('rejects re-use of a one-time token', async () => {
    const info = await server.startServer()
    try {
      await postJson('127.0.0.1', info.port, { token: info.token, pubkey: 'pkA', name: 'A' })
      const r = await postJson('127.0.0.1', info.port, { token: info.token, pubkey: 'pkB', name: 'B' })
      expect(r.status).toBe(401)
    } finally { server.stopServer() }
  })

  it('revokeDevice removes the device from the paired list', async () => {
    const info = await server.startServer()
    try {
      const r = await postJson('127.0.0.1', info.port, { token: info.token, pubkey: 'pk', name: 'Phone' })
      server.revokeDevice(r.body.deviceId)
      expect(server.getPairedDevices().find((d) => d.id === r.body.deviceId)).toBeUndefined()
    } finally { server.stopServer() }
  })

  it('persists the cert fingerprint across restarts', async () => {
    const a = await server.startServer()
    server.stopServer()
    const b = await server.startServer()
    try {
      expect(a.fp).toBeTruthy()
      expect(a.fp).toBe(b.fp)
      expect(a.token).not.toBe(b.token)
    } finally { server.stopServer() }
  })
})
