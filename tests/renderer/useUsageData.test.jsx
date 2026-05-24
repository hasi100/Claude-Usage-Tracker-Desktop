import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { useUsageData } from '../../src/renderer/hooks/useUsageData'

beforeEach(() => vi.clearAllMocks())

describe('useUsageData parsing', () => {
  it('returns null when not authenticated', async () => {
    const { result } = renderHook(() => useUsageData({ connected: false }))
    expect(result.current.usage).toBeNull()
  })

  it('parses 0–1 decimal utilization into percentages', async () => {
    window.electronAPI.fetchUsage.mockResolvedValue({
      ok: true,
      data: {
        five_hour:        { utilization: 0.43, resets_at: '2026-05-25T00:00:00Z' },
        seven_day:        { utilization: 0.10, resets_at: '2026-06-01T00:00:00Z' },
        seven_day_opus:   { utilization: 0.00, resets_at: '2026-06-01T00:00:00Z' },
      },
    })
    const { result } = renderHook(() => useUsageData({ connected: true }))
    await waitFor(() => expect(result.current.usage?.session).toBe(43))
    expect(result.current.usage.weekly).toBe(10)
    expect(result.current.usage.design).toBe(0)
  })

  it('accepts already-percentage values (>1) unchanged', async () => {
    window.electronAPI.fetchUsage.mockResolvedValue({
      ok: true,
      data: { five_hour: { utilization: 87 }, seven_day: {}, seven_day_opus: {} },
    })
    const { result } = renderHook(() => useUsageData({ connected: true }))
    await waitFor(() => expect(result.current.usage?.session).toBe(87))
  })

  it('rounds to integers', async () => {
    window.electronAPI.fetchUsage.mockResolvedValue({
      ok: true,
      data: { five_hour: { utilization: 0.456 }, seven_day: {}, seven_day_opus: {} },
    })
    const { result } = renderHook(() => useUsageData({ connected: true }))
    await waitFor(() => expect(result.current.usage?.session).toBe(46))
  })

  it('forceRefresh re-invokes fetch', async () => {
    window.electronAPI.fetchUsage.mockResolvedValue({ ok: true, data: { five_hour: {}, seven_day: {}, seven_day_opus: {} } })
    const { result } = renderHook(() => useUsageData({ connected: true }))
    await waitFor(() => expect(window.electronAPI.fetchUsage).toHaveBeenCalled())

    await act(() => result.current.forceRefresh())
    expect(window.electronAPI.fetchUsage.mock.calls.length).toBeGreaterThanOrEqual(2)
  })
})
