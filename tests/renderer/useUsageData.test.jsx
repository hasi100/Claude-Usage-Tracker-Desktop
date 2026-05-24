import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { useUsageData } from '../../src/renderer/hooks/useUsageData'

beforeEach(() => vi.clearAllMocks())

describe('useUsageData parsing', () => {
  it('returns null when not authenticated', async () => {
    const { result } = renderHook(() => useUsageData({ connected: false }))
    expect(result.current.usage).toBeNull()
  })

  it('inverts utilization to "% used" (API field is remaining capacity)', async () => {
    // claude.ai gives 0.36 = 36% capacity remaining → display 64% used.
    window.electronAPI.fetchUsage.mockResolvedValue({
      ok: true,
      data: {
        five_hour:      { utilization: 0.36, resets_at: '2026-05-25T00:00:00Z' },
        seven_day:      { utilization: 0.45, resets_at: '2026-06-01T00:00:00Z' },
        seven_day_opus: { utilization: 1.00, resets_at: '2026-06-01T00:00:00Z' },
      },
    })
    const { result } = renderHook(() => useUsageData({ connected: true }))
    await waitFor(() => expect(result.current.usage?.session).toBe(64))
    expect(result.current.usage.weekly).toBe(55)
    expect(result.current.usage.design).toBe(0)
  })

  it('handles already-percentage values (>1) consistently', async () => {
    window.electronAPI.fetchUsage.mockResolvedValue({
      ok: true,
      data: { five_hour: { utilization: 13 }, seven_day: {}, seven_day_opus: {} },
    })
    const { result } = renderHook(() => useUsageData({ connected: true }))
    // 13 → 100-13 = 87% used
    await waitFor(() => expect(result.current.usage?.session).toBe(87))
  })

  it('clamps used % between 0 and 100', async () => {
    // utilization 0 = no remaining capacity = 100% used
    // utilization 1.0 = full remaining = 0% used
    window.electronAPI.fetchUsage.mockResolvedValue({
      ok: true,
      data: { five_hour: { utilization: 0 }, seven_day: { utilization: 1.0 }, seven_day_opus: {} },
    })
    const { result } = renderHook(() => useUsageData({ connected: true }))
    await waitFor(() => expect(result.current.usage?.session).toBe(100))
    expect(result.current.usage.weekly).toBe(0)
  })

  it('forceRefresh re-invokes fetch', async () => {
    window.electronAPI.fetchUsage.mockResolvedValue({ ok: true, data: { five_hour: {}, seven_day: {}, seven_day_opus: {} } })
    const { result } = renderHook(() => useUsageData({ connected: true }))
    await waitFor(() => expect(window.electronAPI.fetchUsage).toHaveBeenCalled())

    await act(() => result.current.forceRefresh())
    expect(window.electronAPI.fetchUsage.mock.calls.length).toBeGreaterThanOrEqual(2)
  })
})
