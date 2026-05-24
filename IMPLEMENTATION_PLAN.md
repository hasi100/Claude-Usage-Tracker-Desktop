# Claude Usage Tracker — v2 Implementation Plan

Reference: [hamed-elfayome/Claude-Usage-Tracker @ 2611dcc](https://github.com/hamed-elfayome/Claude-Usage-Tracker/commit/2611dcc396d553e00652c3c448056a92020b7172)

Scope: redesign Settings with a sidebar, polish minimize UX, add **API Console** + **Claude Code CLI** usage tracking, and add **Mobile Pairing via QR** (new — not in reference).

---

## 1. Goals (in order)

1. **Settings UX** — clean two-pane sidebar layout (tabs on left, content on right), no scrollbars, themed light/dark.
2. **Minimize UX** — one-click mini pill, draggable, double-click to expand. No grey ghost.
3. **Multi-source tracking** — user can monitor:
   - **Web** (claude.ai usage — already working)
   - **API Console** (Anthropic console: monthly $ + per-key + per-model)
   - **CLI** (`~/.claude` local sessions, token estimates)
4. **Profile switcher** — N profiles, each with independent credentials + display prefs.
5. **Mobile pairing** — pair a phone via QR; phone reads session key and shows live stats.

---

## 2. Settings — sidebar redesign

### Layout

```
┌──────────────────────────────────────────────┐
│  ◆ Claude Usage          – × │  title bar    │
├───────────┬──────────────────────────────────┤
│           │                                  │
│ ◐ Profile │  [profile dropdown]              │
│ 🔑 Auth   │  [content for active tab]        │
│ 📊 Sources│                                  │
│ 🎨 Display│                                  │
│ 📱 Mobile │                                  │
│ ⚙ General │                                  │
│           │                                  │
└───────────┴──────────────────────────────────┘
```

### Tabs

| Tab          | Contains                                                                          |
| ------------ | --------------------------------------------------------------------------------- |
| **Profile**  | Profile list + add/rename/delete. Active profile dropdown.                        |
| **Auth**     | Per-profile: Claude.ai session key, API key, CLI auto-detect status.              |
| **Sources**  | Toggle which sources to poll (Web / API / CLI). Refresh interval per source.      |
| **Display**  | Ring visibility, style (cards/rings), show-remaining, theme (dark/light), accent. |
| **Mobile**   | QR pair button, paired-device list, revoke.                                       |
| **General**  | Start on login, opacity, window position lock, About.                             |

### Implementation notes
- New component `SettingsSidebar.jsx` — renders the tab strip; `<Settings/>` becomes a router into `SettingsProfile`, `SettingsAuth`, `SettingsSources`, `SettingsDisplay`, `SettingsMobile`, `SettingsGeneral`.
- Active tab persisted in `electron-store` under `ui.settingsTab` for next-open continuity.
- Sidebar width: 96 px fixed. Content pane: flex. App-shell expands to ~440 × N px while settings is open; ResizeObserver in `App.jsx` already drives this.
- All tabs are vertically short enough to fit without scroll (target: ≤ 380 px content height).

---

## 3. Minimize UX

### Issues with current
- Mini pill leaves grey corner artifacts (OS window shadow around rect). Already partially fixed by `hasShadow: false` on Win11.
- No keyboard shortcut to toggle.
- Double-click to expand is hidden — needs hint.

### Plan
- Add `Ctrl+M` / `Cmd+M` global shortcut to toggle mini.
- Mini pill: show a chevron `›` on hover indicating expand affordance.
- On entering mini, store last-known bounds and restore on expand (not just position).
- Add **always-on-top toggle** to title bar (pin icon).
- Tray menu entry: "Minimize to pill" / "Expand".

---

## 4. Multi-source usage tracking

### 4.1 Web source (existing)
- Already polls `https://claude.ai/api/organizations/{uuid}/usage`. Keep as-is.

### 4.2 API Console source (new)
- Anthropic Console exposes per-org usage at `https://api.anthropic.com/v1/organizations/{org_id}/usage_report/messages` (admin API key required, `x-api-key` header with `sk-ant-admin01-...`).
- Endpoints needed:
  - `usage_report/messages` — token counts grouped by model/key/day.
  - `usage_report/cost` — daily $ totals.
- Add `src/main/sources/apiConsole.js`:
  - `fetchMonthlyCost(adminKey, orgId)` → `{ total, byKey: [...], byModel: [...] }`
  - `fetchDailyCostChart(adminKey, orgId, days=30)` → `[{date, cost}, ...]`
- IPC: `api:fetch-usage` returns aggregated structure.
- Renderer: new `ApiUsageCard.jsx` shows month-to-date $, last-7-day spark line, top 3 models by cost.

### 4.3 CLI source (new)
- Read `~/.claude/projects/*/conversation-*.jsonl` (locally cached transcripts written by Claude Code).
- Sum token usage per file (each line has `usage: { input_tokens, output_tokens, cache_creation_input_tokens, cache_read_input_tokens }`).
- Group by day, by model, by project directory.
- Add `src/main/sources/cli.js`:
  - `scanCliSessions()` → `{ today: {input, output, cache}, week: [...], byProject: [...] }`
  - Watches `~/.claude/projects/` via `chokidar` for live updates.
- IPC: `cli:fetch-usage`.
- Renderer: `CliUsageCard.jsx` — today's tokens, top 3 active projects, last session time.

### 4.4 Source switcher in main view
- Title-bar segmented control: **Web | API | CLI | All**.
- Persist `ui.activeSource` in store.
- "All" mode stacks all three cards vertically with section headers.

---

## 5. Profile system

### Data shape (in `electron-store`)
```js
{
  profiles: [
    {
      id: 'uuid',
      name: 'Personal',          // fun auto-name or user-set
      color: '#F65D1F',          // accent override
      claudeWebSessionKey: '...', // encrypted via safeStorage
      claudeOrgId: 'uuid',
      anthropicAdminKey: '...',   // encrypted
      anthropicOrgId: '...',
      sources: { web: true, api: false, cli: true },
    },
    // ...
  ],
  activeProfileId: 'uuid',
}
```

### UI
- Sidebar header: pill with active profile name + color dot + dropdown caret.
- Settings → Profile tab: list of profiles with edit / delete / set-active.
- Auto-name generator: pick from `['Falcon', 'Otter', 'Lynx', ...]` + adjective.

### Migration
- On v2 first run, wrap existing single-key config into `profiles[0]` named "Default".

---

## 6. Mobile pairing via QR

### Threat model
- Session key is highly sensitive (full claude.ai access).
- **Never** put the raw session key in a QR. Instead: provision a short-lived pairing token that the mobile app exchanges for an end-to-end encrypted channel.

### Architecture

```
Desktop ───────── pairing.json ────────── Mobile
   │                                         │
   │      1. user clicks "Pair mobile"       │
   │      2. desktop starts local HTTPS      │
   │         server on 127.0.0.1:PORT        │
   │         + generates one-time token T    │
   │         + generates X25519 keypair      │
   │      3. shows QR encoding:              │
   │           {                             │
   │             v: 1,                       │
   │             url: "https://LAN_IP:PORT", │
   │             token: T,                   │
   │             pubkey: BASE64,             │
   │             ttl: 120                    │
   │           }                             │
   │ ◄─── 4. phone scans, POSTs its pubkey ──│
   │      5. ECDH → shared secret K          │
   │      6. desktop pushes usage events     │
   │         encrypted with K over SSE       │
```

### Components
- `src/main/pairing/server.js` — `https` server (self-signed cert generated on first run, cert pinned in mobile via the QR). Routes:
  - `POST /pair` — body: `{ pubkey, token }`. Returns `{ ok: true, deviceId }`.
  - `GET /stream` — SSE; headers must include `Authorization: Bearer <deviceId>` and event payloads are XChaCha20-Poly1305 encrypted.
  - `POST /unpair` — revoke device.
- `src/main/pairing/crypto.js` — uses `tweetnacl` (already small, no native deps).
- `src/renderer/components/QrPair.jsx` — uses `qrcode` npm package to render. Shows countdown + "Cancel pair".
- Paired devices persisted with name, public key, last-seen.

### Mobile side (out of scope for this repo)
- The QR payload spec is the contract. A simple Expo/React-Native PWA can implement the scanner; can be a follow-up repo. For now we document the protocol in `docs/PAIRING_PROTOCOL.md`.

### Privacy
- Session key never leaves the desktop. Mobile only ever sees decrypted *usage stats*, not credentials.
- One-time pairing token expires after 120 s.
- Each paired device has a revoke button.

---

## 7. Dependency additions

| Package        | Purpose                                | Notes                    |
| -------------- | -------------------------------------- | ------------------------ |
| `qrcode`       | Render QR in renderer                  | Pure JS, small           |
| `tweetnacl`    | X25519 + XChaCha20-Poly1305            | Pure JS                  |
| `chokidar`     | Watch `~/.claude/projects` for CLI     | Already common, ~50 kB   |
| `selfsigned`   | Generate self-signed TLS cert          | First-run only           |
| `uuid`         | Profile IDs, device IDs                | Tiny                     |

No native modules — keeps Electron build simple.

---

## 8. Phased rollout

### Phase 1 — Settings sidebar (1 sitting)
- New `SettingsSidebar` + tab routing.
- Migrate existing controls into Display/General/Auth tabs.
- Keep current single-profile behavior.

### Phase 2 — Profile system (1 sitting)
- Multi-profile store shape + migration.
- Profile tab UI.
- Profile dropdown in sidebar header.
- All IPC handlers read `activeProfileId`.

### Phase 3 — API Console source (1 sitting)
- Admin-key auth flow in Auth tab.
- Fetch + parse usage report.
- `ApiUsageCard` component.
- Source switcher in main view.

### Phase 4 — CLI source (1 sitting)
- Scan `~/.claude/projects` JSONL files.
- `chokidar` watcher.
- `CliUsageCard` component.

### Phase 5 — Mobile pairing (2 sittings)
- TLS server + crypto.
- QR generator + Mobile tab UI.
- Document `PAIRING_PROTOCOL.md`.
- Stub mobile client (separate optional repo).

### Phase 6 — Minimize polish
- Global shortcut.
- Tray menu entries.
- Pin / always-on-top toggle.

---

## 9. File map (after implementation)

```
src/main/
  index.js
  ipc.js                          # router; delegates per-source
  auth.js
  tray.js
  store/
    schema.js                     # multi-profile shape + migrations
  sources/
    web.js                        # existing claude.ai logic moved here
    apiConsole.js                 # new
    cli.js                        # new
  pairing/
    server.js                     # new
    crypto.js                     # new
    cert.js                       # self-signed cert mgmt

src/renderer/
  App.jsx
  hooks/
    useUsageData.js               # multi-source aware
    useProfile.js                 # new
  components/
    UsageCard.jsx
    ApiUsageCard.jsx              # new
    CliUsageCard.jsx              # new
    SourceSwitcher.jsx            # new
    MiniPill.jsx
    QrPair.jsx                    # new
    Settings/
      index.jsx                   # sidebar + router
      SettingsSidebar.jsx
      tabs/
        Profile.jsx
        Auth.jsx
        Sources.jsx
        Display.jsx
        Mobile.jsx
        General.jsx
  styles/
    glass.css

docs/
  PAIRING_PROTOCOL.md             # new — QR + handshake spec
```

---

## 10. Open questions for you

1. **API Console admin key** — do you have one? (Required for `usage_report` endpoint. Otherwise we fall back to scraping the console web UI, which is fragile.)
2. **Mobile app** — do you want this repo to also house an Expo mobile client, or only the desktop side + protocol doc?
3. **Profile colors** — should each profile's accent override the global theme, or just appear as a dot label?
4. **CLI scope** — track *all* projects in `~/.claude/projects` or let user opt-in per folder?

Once you answer these (or say "your call" on any), Phase 1 begins.
