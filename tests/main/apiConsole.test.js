import { describe, it, expect, beforeEach } from 'vitest'
import * as api from '../../src/main/sources/apiConsole.js'

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
            const key = [...handlers.keys()].find((k) => url.startsWith(k))
            const handler = key && handlers.get(key)
            if (!handler) { listeners.error?.(new Error(`no handler: ${url}`)); return }
            const res = {
              statusCode: handler.status,
              on(event, cb) {
                if (event === 'data') cb(Buffer.from(JSON.stringify(handler.body)))
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

const respond = (prefix, status, body) => handlers.set(prefix, { status, body })

beforeEach(() => {
  handlers.clear()
  api.setNet(makeNet())
})

describe('sources/apiConsole', () => {
  it('aggregates monthly cost across buckets', async () => {
    respond('https://api.anthropic.com/v1/organizations/cost_report?starting_at=', 200, {
      data: [
        { starting_at: '2026-05-01', results: [{ amount: { amount: 12.5 } }, { amount: { amount: 3.25 } }] },
        { starting_at: '2026-05-02', results: [{ amount: { amount: 4.25 } }] },
      ],
    })
    respond('https://api.anthropic.com/v1/organizations/usage_report/messages', 200, { data: [] })
    const r = await api.getUsage('sk-ant-admin-test')
    expect(r.monthCost).toBeCloseTo(12.5 + 3.25 + 4.25, 2)
    expect(r.daily).toBeDefined()
  })

  it('falls back to cost field when amount.amount is absent', async () => {
    respond('https://api.anthropic.com/v1/organizations/cost_report?starting_at=', 200, {
      data: [{ starting_at: '2026-05-01', results: [{ cost: 9.99 }] }],
    })
    respond('https://api.anthropic.com/v1/organizations/usage_report/messages', 200, { data: [] })
    const r = await api.getUsage('sk-ant-admin-test')
    expect(r.monthCost).toBeCloseTo(9.99, 2)
  })

  it('ranks top 3 models by total tokens', async () => {
    respond('https://api.anthropic.com/v1/organizations/cost_report?starting_at=', 200, { data: [] })
    respond('https://api.anthropic.com/v1/organizations/usage_report/messages', 200, {
      data: [
        { results: [
          { model: 'claude-3-5-sonnet', input_tokens: 1000, output_tokens: 500 },
          { model: 'claude-3-haiku',    input_tokens:  200, output_tokens: 100 },
          { model: 'claude-3-opus',     input_tokens: 5000, output_tokens: 2500 },
          { model: 'claude-3-haiku',    input_tokens:  100, output_tokens:  50 },
        ] },
      ],
    })
    const r = await api.getUsage('sk-ant-admin-test')
    expect(r.topModels[0].model).toBe('claude-3-opus')
    expect(r.topModels[1].model).toBe('claude-3-5-sonnet')
    expect(r.topModels[2].model).toBe('claude-3-haiku')
    expect(r.topModels[2].tokens).toBe(450)
  })

  it('throws AUTH_EXPIRED on 401', async () => {
    respond('https://api.anthropic.com/v1/organizations/cost_report?starting_at=', 401, {})
    await expect(api.getUsage('bad-key')).rejects.toThrow(/AUTH_EXPIRED/)
  })
})
