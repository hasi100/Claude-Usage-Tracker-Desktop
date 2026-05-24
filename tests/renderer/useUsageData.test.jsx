import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { useUsageData } from '../../src/renderer/hooks/useUsageData'

beforeEach(() => vi.clearAllMocks())

describe('useUsageData parsing', () => {
  it('returns null when not authenticated', async () => {
    const { result } = renderHook(() => useUsageData({ connected: false }))
    expect(result.current.usage).toBeNull()
  })

  it('reads utilization as "% used" (already in used form)', async () => {
    // API utilization 0.74 ↔ claude.ai's "74% used" label.
    window.electronAPI.fetchUsage.mockResolvedValue({
      ok: true,
      data: {
        five_hour:      { utilization: 0.74, resets_at: '2026-05-25T00:00:00Z' },
        seven_day:      { utilization: 0.59, resets_at: '2026-06-01T00:00:00Z' },
        seven_day_opus: { utilization: 0.00, resets_at: '2026-06-01T00:00:00Z' },
      },
    })
    const { result } = renderHook(() => useUsageData({ connected: true }))
    await waitFor(() => expect(result.current.usage?.session).toBe(74))
    expect(result.current.usage.weekly).toBe(59)
    expect(result.current.usage.design).toBe(0)
  })

  it('passes through values already expressed as percentages', async () => {
    window.electronAPI.fetchUsage.mockResolvedValue({
      ok: true,
      data: { five_hour: { utilization: 87 }, seven_day: {}, seven_day_opus: {} },
    })
    const { result } = renderHook(() => useUsageData({ connected: true }))
    await waitFor(() => expect(result.current.usage?.session).toBe(87))
  })

  it('clamps used % between 0 and 100', async () => {
    window.electronAPI.fetchUsage.mockResolvedValue({
      ok: true,
      data: { five_hour: { utilization: 1.0 }, seven_day: { utilization: 0 }, seven_day_opus: {} },
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
