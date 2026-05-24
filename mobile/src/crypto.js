// Mobile-side mirror of src/main/pairing/crypto.js
import nacl from 'tweetnacl'
import base64 from 'react-native-base64'

const toUint8 = (s) => {
  const bin = base64.decode(s)
  const u = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i)
  return u
}
const toB64 = (u) => {
  let s = ''
  for (let i = 0; i < u.length; i++) s += String.fromCharCode(u[i])
  return base64.encode(s)
}

export function genKeypair() {
  return nacl.box.keyPair()
}

export function decrypt(payload, senderPubB64, ownSecretKey) {
  const opened = nacl.box.open(toUint8(payload.c), toUint8(payload.n), toUint8(senderPubB64), ownSecretKey)
  if (!opened) return null
  try { return JSON.parse(String.fromCharCode(...opened)) } catch { return null }
}

export { toB64, toUint8 }
