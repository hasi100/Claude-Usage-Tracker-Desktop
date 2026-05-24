# Mobile Pairing Protocol — v1

## Goals
- Mobile client receives **live usage stats** from the desktop.
- The desktop's session keys / admin keys **never** leave the desktop.
- One-time pairing; the mobile client persists its `deviceId` + shared key material.

## Threat model
- Local network is untrusted (cafe Wi-Fi). All payloads are encrypted with `nacl.box` (X25519 + XSalsa20-Poly1305).
- Self-signed TLS for transport. The QR includes the cert fingerprint; the mobile client **must** pin it.
- A leaked QR token is useless 120 s after generation.

## QR payload (v1)

```json
{
  "v": 1,
  "url": "https://192.168.1.42:54123",
  "fp": "ab12cd34…",           // SHA-256 of server cert DER, lowercase hex
  "token": "BASE64_16B",       // one-time, single-use
  "pubkey": "BASE64_32B"       // desktop's X25519 public key
}
```

## Handshake

1. **Mobile scans QR**, validates `v === 1` and `Date.now() < QR_time + 120s`.
2. Mobile generates its own X25519 keypair `(m_pk, m_sk)`.
3. Mobile POSTs to `${url}/pair`:
   ```json
   { "token": "...", "pubkey": "<m_pk_b64>", "name": "iPhone 15" }
   ```
   - TLS connection must verify the certificate fingerprint equals `fp`.
4. Desktop validates the token (single-use, unexpired), stores the device, returns:
   ```json
   { "ok": true, "deviceId": "BASE64_16B" }
   ```
5. Mobile saves `{ deviceId, server_pk, m_sk, url, fp }` locally.

## Streaming

- Mobile opens `GET ${url}/stream` with header `Authorization: Bearer <deviceId>`.
- Server emits SSE frames; each `data:` line is JSON of the form:
  ```json
  { "n": "<nonce_b64>", "c": "<ciphertext_b64>" }
  ```
- Decrypt with `nacl.box.open(c, n, server_pk, m_sk)`. Plaintext is JSON:
  ```json
  { "event": "web-usage" | "api-usage" | "cli-usage" | "hello", "data": { ... }, "t": 1234 }
  ```

## Revoke

- Desktop UI lists paired devices. Revoking a device removes it from the server state and closes its active SSE connection.
- Mobile sees the stream terminate; it should clear local credentials and prompt for re-pair.

## Open items (post-v1)
- Push notifications when 75/90/100 % thresholds cross. Likely requires a relay; out of scope for v1.
- Multi-desktop pairing.
- WebSocket fallback if SSE proves unreliable on iOS background.
