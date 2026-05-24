import { describe, it, expect, beforeEach } from 'vitest'
import * as web from '../../src/main/sources/web.js'

const handlers = new Map()

function makeNet() {
  return {
    request: ({ url }) => {
      const listeners = {}
      const req = {
        setHeader() {},
        on(event, cb) { listeners[event] = cb; return req },
        write() {},
        end() {
          setImmediate(() => {
            const handler = handlers.get(url)
            if (!handler) { listeners.error?.(new Error(`No handler for ${url}`)); return }
            const res = {
              statusCode: handler.status,
              on(event, cb) {
                if (event === 'data') handler.chunks.forEach((c) => cb(Buffer.from(c)))
                if (event === 'end') cb()
              },
            }
            listeners.response?.(res)
          })
        },
      }
      return req
    },
  }
}

function respond(url, status, body) {
  handlers.set(url, { status, chunks: [typeof body === 'string' ? body : JSON.stringify(body)] })
}

beforeEach(() => {
  handlers.clear()
  web.setNet(makeNet())
})

describe('sources/web', () => {
  describe('fetchOrgId', () => {
    it('extracts uuid from { organizations: [...] } shape', async () => {
      respond('https://claude.ai/api/organizations', 200, {
        organizations: [{ uuid: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', name: 'Personal' }],
      })
      const id = await web.fetchOrgId('sk-test')
      expect(id).toBe('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa')
    })

    it('accepts a bare array response', async () => {
      respond('https://claude.ai/api/organizations', 200, [
        { uuid: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb' },
      ])
      const id = await web.fetchOrgId('sk-test')
      expect(id).toBe('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb')
    })

    it('throws when no orgs are returned', async () => {
      respond('https://claude.ai/api/organizations', 200, { organizations: [] })
      await expect(web.fetchOrgId('sk-test')).rejects.toThrow(/No organizations/)
    })

    it('throws when uuid is not a valid UUID', async () => {
      respond('https://claude.ai/api/organizations', 200, { organizations: [{ uuid: '18905515' }] })
      await expect(web.fetchOrgId('sk-test')).rejects.toThrow(/Invalid org uuid/)
    })

    it('throws on non-200 status', async () => {
      respond('https://claude.ai/api/organizations', 403, 'forbidden')
      await expect(web.fetchOrgId('sk-test')).rejects.toThrow(/HTTP 403/)
    })
  })

  describe('fetchUsage', () => {
    const orgId = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
    const url = `https://claude.ai/api/organizations/${orgId}/usage`

    it('returns the data body on 200', async () => {
      respond(url, 200, { five_hour: { utilization: 0.4 } })
      const data = await web.fetchUsage('sk-test', orgId)
      expect(data.five_hour.utilization).toBe(0.4)
    })

    it('maps 401 to AUTH_EXPIRED', async () => {
      respond(url, 401, 'nope')
      await expect(web.fetchUsage('sk-test', orgId)).rejects.toThrow('AUTH_EXPIRED')
    })

    it('maps 403 to AUTH_EXPIRED', async () => {
      respond(url, 403, 'cf challenge')
      await expect(web.fetchUsage('sk-test', orgId)).rejects.toThrow('AUTH_EXPIRED')
    })

    it('throws a generic error on 500', async () => {
      respond(url, 500, 'boom')
      await expect(web.fetchUsage('sk-test', orgId)).rejects.toThrow(/HTTP 500/)
    })
  })
})
