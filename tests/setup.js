// Global test setup.
import '@testing-library/jest-dom'
import { vi, afterEach } from 'vitest'
import { cleanup } from '@testing-library/react'

afterEach(() => cleanup())

// Mock the electron preload bridge by default; individual tests override.
globalThis.window.electronAPI = {
  listProfiles:     vi.fn(async () => ({ profiles: [], activeId: null })),
  addProfile:       vi.fn(async () => ({})),
  deleteProfile:    vi.fn(async () => ({})),
  setActiveProfile: vi.fn(async () => ({})),
  updateProfile:    vi.fn(async () => ({})),
  detectCliAuth:    vi.fn(async () => ({ found: false })),
  testSessionKey:   vi.fn(async () => ({ valid: true, orgId: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa' })),
  saveSessionKey:   vi.fn(async () => ({ ok: true })),
  saveAdminKey:     vi.fn(async () => ({ ok: true })),
  clearAuth:        vi.fn(async () => ({ ok: true })),
  getAuthState:     vi.fn(async () => ({ method: null, connected: false })),
  fetchUsage:       vi.fn(async () => ({ ok: true, data: {} })),
  fetchApiUsage:    vi.fn(async () => ({ ok: true, data: { monthCost: 0, daily: [], topModels: [] } })),
  fetchCliUsage:    vi.fn(async () => ({ ok: true, data: { today: {}, all: {}, topProjects: [], fileCount: 0 } })),
  pairStart:        vi.fn(async () => ({ v: 1, host: '127.0.0.1', port: 0, token: 'tok', pubkey: 'pk', fp: 'fp', ttl: 120 })),
  pairStop:         vi.fn(async () => ({ ok: true })),
  pairInfo:         vi.fn(async () => ({})),
  pairDevices:      vi.fn(async () => ([])),
  pairRevoke:       vi.fn(async () => ({ ok: true })),
  getSettings:      vi.fn(async () => ({})),
  saveSettings:     vi.fn(async () => ({ ok: true })),
  setMiniMode:      vi.fn(async () => ({ ok: true })),
  toggleMini:       vi.fn(async () => ({ ok: true })),
  setWindowHeight:  vi.fn(async () => ({ ok: true })),
  setWindowWidth:   vi.fn(async () => ({ ok: true })),
  closeWindow:      vi.fn(async () => ({ ok: true })),
  openExternal:     vi.fn(async () => ({ ok: true })),
  onUsageUpdate:    vi.fn(() => () => {}),
  onCliUpdate:      vi.fn(() => () => {}),
  onAuthRequired:   vi.fn(() => () => {}),
  onMiniChanged:    vi.fn(() => () => {}),
}

// Stub ResizeObserver (jsdom doesn't ship it).
globalThis.ResizeObserver = class {
  observe() {}
  unobserve() {}
  disconnect() {}
}

// QRCode.toCanvas needs a real canvas; jsdom stubs it.
HTMLCanvasElement.prototype.getContext = () => null
