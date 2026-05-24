import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import SourceSwitcher from '../../src/renderer/components/SourceSwitcher'

describe('<SourceSwitcher />', () => {
  it('renders only the enabled sources plus All', () => {
    render(<SourceSwitcher active="web" onChange={() => {}} enabled={{ web: true, api: false, cli: false }} />)
    expect(screen.getByText('Web')).toBeInTheDocument()
    expect(screen.queryByText('API')).toBeNull()
    expect(screen.queryByText('CLI')).toBeNull()
    expect(screen.getByText('All')).toBeInTheDocument()
  })

  it('renders API and CLI when enabled', () => {
    render(<SourceSwitcher active="web" onChange={() => {}} enabled={{ web: true, api: true, cli: true }} />)
    expect(screen.getByText('API')).toBeInTheDocument()
    expect(screen.getByText('CLI')).toBeInTheDocument()
  })

  it('marks the active source with .active', () => {
    const { container } = render(<SourceSwitcher active="api" onChange={() => {}} enabled={{ web: true, api: true, cli: false }} />)
    const active = container.querySelector('.src-btn.active')
    expect(active.textContent).toBe('API')
  })

  it('fires onChange with the new source key', () => {
    const onChange = vi.fn()
    render(<SourceSwitcher active="web" onChange={onChange} enabled={{ web: true, api: true, cli: false }} />)
    fireEvent.click(screen.getByText('API'))
    expect(onChange).toHaveBeenCalledWith('api')
  })
})
