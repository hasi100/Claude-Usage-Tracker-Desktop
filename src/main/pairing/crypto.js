// X25519 key exchange + XChaCha20-Poly1305 (via nacl.box).
// Pairing flow:
//   - Desktop generates an ephemeral keypair per pairing session.
//   - QR encodes desktop pubkey + one-time token + host:port.
//   - Phone POSTs its pubkey + the token → desktop computes shared key.
//   - All subsequent SSE events are encrypted with nacl.box using the
//     established shared key (sender keypair = desktop's; recipient = phone's).

const nacl = require('tweetnacl')

function genKeypair() {
  return nacl.box.keyPair()
}

function toB64(u8) {
  return Buffer.from(u8).toString('base64')
}

function fromB64(s) {
  return new Uint8Array(Buffer.from(s, 'base64'))
}

function encrypt(message, recipientPubB64, ownSecretKey) {
  const nonce = nacl.randomBytes(nacl.box.nonceLength)
  const box = nacl.box(
    Buffer.from(JSON.stringify(message), 'utf-8'),
    nonce,
    fromB64(recipientPubB64),
    ownSecretKey,
  )
  return {
    n: toB64(nonce),
    c: toB64(box),
  }
}

function decrypt(payload, senderPubB64, ownSecretKey) {
  const opened = nacl.box.open(
    fromB64(payload.c),
    fromB64(payload.n),
    fromB64(senderPubB64),
    ownSecretKey,
  )
  if (!opened) return null
  try { return JSON.parse(Buffer.from(opened).toString('utf-8')) }
  catch { return null }
}

function randomToken() {
  return toB64(nacl.randomBytes(16))
}

module.exports = { genKeypair, toB64, fromB64, encrypt, decrypt, randomToken }
