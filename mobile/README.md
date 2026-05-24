# Claude Usage Tracker — Mobile Companion

React Native (Expo) app that pairs with the desktop tracker and shows
live usage stats. Credentials never leave the desktop.

## Setup

```bash
cd mobile
npm install
npx expo start
```

Then either:
- Scan the Expo Go QR with your phone, or
- Press `i` (iOS Simulator) / `a` (Android Emulator).

## Architecture

See [../docs/PAIRING_PROTOCOL.md](../docs/PAIRING_PROTOCOL.md) for the wire
protocol. Briefly:

1. **PairScreen** — uses `expo-camera` to scan the QR from the desktop
   Settings → Mobile tab.
2. **handshake.ts** — POSTs `m_pk` to `${url}/pair`, persists the resulting
   `deviceId` + key material with `expo-secure-store`.
3. **DashboardScreen** — opens an SSE stream, decrypts events with
   `tweetnacl`, renders cards mirroring the desktop UI.

## Status

Phase 5 — raw scaffold. The pair + stream logic is wired; UI is intentionally
minimal so design can iterate later.
