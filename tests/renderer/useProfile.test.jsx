import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { useProfile } from '../../src/renderer/hooks/useProfile'

beforeEach(() => vi.clearAllMocks())

describe('useProfile', () => {
  it('loads profiles on mount', async () => {
    window.electronAPI.listProfiles.mockResolvedValueOnce({
      profiles: [{ id: 'a', name: 'A', color: '#fff', sources: {} }],
      activeId: 'a',
    })
    const { result } = renderHook(() => useProfile())
    await waitFor(() => expect(result.current.profiles).toHaveLength(1))
    expect(result.current.active.name).toBe('A')
  })

  it('setActive calls the IPC and refreshes', async () => {
    window.electronAPI.listProfiles
      .mockResolvedValueOnce({ profiles: [{ id: 'a', name: 'A' }, { id: 'b', name: 'B' }], activeId: 'a' })
      .mockResolvedValueOnce({ profiles: [{ id: 'a', name: 'A' }, { id: 'b', name: 'B' }], activeId: 'b' })

    const { result } = renderHook(() => useProfile())
    await waitFor(() => expect(result.current.profiles).toHaveLength(2))

    await act(() => result.current.setActive('b'))
    expect(window.electronAPI.setActiveProfile).toHaveBeenCalledWith('b')
    await waitFor(() => expect(result.current.active.id).toBe('b'))
  })

  it('add and remove operate via IPC', async () => {
    window.electronAPI.listProfiles.mockResolvedValue({ profiles: [], activeId: null })
    const { result } = renderHook(() => useProfile())
    await waitFor(() => result.current.profiles)

    await act(() => result.current.add())
    expect(window.electronAPI.addProfile).toHaveBeenCalled()

    await act(() => result.current.remove('x'))
    expect(window.electronAPI.deleteProfile).toHaveBeenCalledWith('x')
  })

  it('update forwards id + patch', async () => {
    window.electronAPI.listProfiles.mockResolvedValue({ profiles: [{ id: 'a', name: 'A' }], activeId: 'a' })
    const { result } = renderHook(() => useProfile())
    await waitFor(() => result.current.profiles.length === 1)

    await act(() => result.current.update('a', { name: 'A2' }))
    expect(window.electronAPI.updateProfile).toHaveBeenCalledWith('a', { name: 'A2' })
  })
})
