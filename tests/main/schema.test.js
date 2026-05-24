import { describe, it, expect, beforeEach } from 'vitest'
import * as schema from '../../src/main/store/schema.js'

schema.setSafeStorage({
  isEncryptionAvailable: () => true,
  encryptString: (s) => Buffer.from(`enc:${s}`),
  decryptString: (buf) => buf.toString('utf-8').replace(/^enc:/, ''),
})

function makeStore() {
  const data = new Map()
  return {
    get: (k, fallback) => (data.has(k) ? data.get(k) : fallback),
    set: (k, v) => data.set(k, v),
  }
}

describe('store/schema', () => {
  let store
  beforeEach(() => { store = makeStore() })

  describe('migrate', () => {
    it('creates a Default profile on first run', () => {
      schema.migrate(store)
      const ps = store.get('profiles')
      expect(ps).toHaveLength(1)
      expect(ps[0].name).toBe('Default')
      expect(store.get('activeProfileId')).toBe(ps[0].id)
    })

    it('wraps a legacy session-key store into profiles[0]', () => {
      store.set('claude_session_key', 'enc:legacy-sk-key')
      store.set('org_id', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa')
      store.set('auth_method', 'session-key')
      schema.migrate(store)
      const p = store.get('profiles')[0]
      expect(p.claudeWebSessionKey).toBe('enc:legacy-sk-key')
      expect(p.claudeOrgId).toBe('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa')
    })

    it('is idempotent — running twice does not duplicate profiles', () => {
      schema.migrate(store)
      schema.migrate(store)
      expect(store.get('profiles')).toHaveLength(1)
    })
  })

  describe('CRUD', () => {
    beforeEach(() => schema.migrate(store))

    it('addProfile appends a new profile with a unique id and color', () => {
      const before = store.get('profiles')
      const p = schema.addProfile(store)
      const after = store.get('profiles')
      expect(after).toHaveLength(before.length + 1)
      expect(p.id).not.toBe(before[0].id)
      expect(p.color).not.toBe(before[0].color)
    })

    it('updateProfile patches only the given fields', () => {
      const [p] = store.get('profiles')
      schema.updateProfile(store, p.id, { name: 'Renamed' })
      const updated = store.get('profiles')[0]
      expect(updated.name).toBe('Renamed')
      expect(updated.id).toBe(p.id)
      expect(updated.color).toBe(p.color)
    })

    it('deleteProfile removes the profile and reassigns active', () => {
      schema.addProfile(store)
      const [first, second] = store.get('profiles')
      schema.setActiveProfile(store, first.id)
      schema.deleteProfile(store, first.id)
      expect(store.get('profiles')).toHaveLength(1)
      expect(store.get('activeProfileId')).toBe(second.id)
    })

    it('deleteProfile cannot leave the user with zero profiles', () => {
      const [only] = store.get('profiles')
      schema.deleteProfile(store, only.id)
      expect(store.get('profiles')).toHaveLength(1)
    })

    it('setActiveProfile is a no-op for unknown id', () => {
      const before = store.get('activeProfileId')
      const r = schema.setActiveProfile(store, 'nope')
      expect(r).toBeNull()
      expect(store.get('activeProfileId')).toBe(before)
    })
  })

  describe('encryption helpers', () => {
    it('encrypt/decrypt round-trips a string', () => {
      const c = schema.encrypt('hello')
      expect(c).toBe(Buffer.from('enc:hello').toString('base64'))
      expect(schema.decrypt(c)).toBe('hello')
    })

    it('encrypt returns null for null input', () => {
      expect(schema.encrypt(null)).toBeNull()
    })

    it('decrypt returns null for non-string input', () => {
      expect(schema.decrypt(123)).toBeNull()
      expect(schema.decrypt(null)).toBeNull()
    })
  })

  describe('publicProfile', () => {
    it('strips encrypted credentials but exposes presence flags', () => {
      schema.migrate(store)
      const [p] = store.get('profiles')
      schema.updateProfile(store, p.id, {
        claudeWebSessionKey: 'enc-blob',
        anthropicAdminKey: 'enc-admin',
      })
      const pub = schema.publicProfile(store.get('profiles')[0])
      expect(pub.hasClaudeWebKey).toBe(true)
      expect(pub.hasAnthropicKey).toBe(true)
      expect(pub).not.toHaveProperty('claudeWebSessionKey')
      expect(pub).not.toHaveProperty('anthropicAdminKey')
    })

    it('returns null for null profile', () => {
      expect(schema.publicProfile(null)).toBeNull()
    })
  })
})
