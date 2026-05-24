import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import Settings from '../../src/renderer/components/Settings/index.jsx'

beforeEach(() => {
  vi.clearAllMocks()
  window.electronAPI.getSettings.mockResolvedValue({
    refreshInterval: 60,
    autoStart: false,
    opacity: 0.9,
    visibleRings: { session: true, weekly: true, design: true },
    ringStyle: 'cards',
    activeTab: 'profile',
  })
  window.electronAPI.listProfiles.mockResolvedValue({
    profiles: [{ id: 'p1', name: 'Default', color: '#F65D1F', sources: { web: true, api: false, cli: false } }],
    activeId: 'p1',
  })
})

describe('<Settings />', () => {
  it('renders the sidebar with all six tabs (no icons)', async () => {
    render(<Settings onClose={() => {}} authState={{ method: 'session-key', connected: true }} onReauth={() => {}} onSettingsChange={() => {}} />)
    await waitFor(() => screen.getByText('Profiles'))
    for (const label of ['Profile', 'Auth', 'Sources', 'Display', 'Mobile', 'General']) {
      expect(screen.getByRole('button', { name: label })).toBeInTheDocument()
    }
  })

  it('switching tabs renders the new tab content', async () => {
    const { container } = render(<Settings onClose={() => {}} authState={{ method: 'session-key', connected: true }} onReauth={() => {}} onSettingsChange={() => {}} />)
    await waitFor(() => screen.getByText('Profiles'))
    fireEvent.click(screen.getByRole('button', { name: 'Display' }))
    expect(container.querySelector('.tab-title').textContent).toBe('Display')
    expect(screen.getByText('Show Rings')).toBeInTheDocument()
  })

  it('persists the active tab via saveSettings on change', async () => {
    render(<Settings onClose={() => {}} authState={{ method: 'session-key', connected: true }} onReauth={() => {}} onSettingsChange={() => {}} />)
    await waitFor(() => screen.getByText('Profiles'))
    fireEvent.click(screen.getByRole('button', { name: 'Mobile' }))
    expect(window.electronAPI.saveSettings).toHaveBeenCalledWith(expect.objectContaining({ activeTab: 'mobile' }))
  })

  it('Close × button invokes onClose', async () => {
    const onClose = vi.fn()
    render(<Settings onClose={onClose} authState={{ method: 'session-key', connected: true }} onReauth={() => {}} onSettingsChange={() => {}} />)
    await waitFor(() => screen.getByText('Profiles'))
    fireEvent.click(screen.getByTitle('Close'))
    expect(onClose).toHaveBeenCalled()
  })
})
