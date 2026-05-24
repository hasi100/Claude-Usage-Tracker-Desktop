import { describe, it, expect } from 'vitest'

// crypto.js requires `tweetnacl` which is CommonJS — works fine via Vitest's
// auto-CJS interop, but we import it dynamically so the module load itself
// is part of the test surface.
const cryptoMod = await import('../../src/main/pairing/crypto.js')
const { genKeypair, encrypt, decrypt, randomToken, toB64, fromB64 } = cryptoMod

describe('pairing/crypto', () => {
  it('genKeypair returns a 32-byte X25519 keypair', () => {
    const kp = genKeypair()
    expect(kp.publicKey).toHaveLength(32)
    expect(kp.secretKey).toHaveLength(32)
  })

  it('encrypt/decrypt round-trips an object end-to-end', () => {
    const desktop = genKeypair()
    const phone = genKeypair()
    const plain = { event: 'web-usage', data: { five_hour: { utilization: 0.42 } }, t: 1700000000 }

    const ciphered = encrypt(plain, toB64(phone.publicKey), desktop.secretKey)
    expect(ciphered).toHaveProperty('n')
    expect(ciphered).toHaveProperty('c')

    const opened = decrypt(ciphered, toB64(desktop.publicKey), phone.secretKey)
    expect(opened).toEqual(plain)
  })

  it('decrypt returns null on tampered ciphertext', () => {
    const a = genKeypair(), b = genKeypair()
    const c = encrypt({ x: 1 }, toB64(b.publicKey), a.secretKey)
    const bytes = fromB64(c.c); bytes[0] ^= 0xff
    c.c = toB64(bytes)
    expect(decrypt(c, toB64(a.publicKey), b.secretKey)).toBeNull()
  })

  it('decrypt returns null when the wrong recipient tries to open', () => {
    const sender = genKeypair(), intended = genKeypair(), attacker = genKeypair()
    const c = encrypt({ secret: 42 }, toB64(intended.publicKey), sender.secretKey)
    expect(decrypt(c, toB64(sender.publicKey), attacker.secretKey)).toBeNull()
  })

  it('randomToken returns 16 bytes encoded as base64', () => {
    const t = randomToken()
    expect(typeof t).toBe('string')
    expect(fromB64(t)).toHaveLength(16)
  })

  it('randomToken collisions are astronomically unlikely', () => {
    const seen = new Set()
    for (let i = 0; i < 1000; i++) seen.add(randomToken())
    expect(seen.size).toBe(1000)
  })
})
