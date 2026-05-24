import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import UsageCard from '../../src/renderer/components/UsageCard'

describe('<UsageCard />', () => {
  it('renders title, tag, and percentage', () => {
    render(<UsageCard title="Session" tag="5h" pct={42} resetAt={new Date(Date.now() + 60_000).toISOString()} windowHours={5} />)
    expect(screen.getByText('Session')).toBeInTheDocument()
    expect(screen.getByText('5h')).toBeInTheDocument()
    expect(screen.getByText('42%')).toBeInTheDocument()
  })

  it('shows remaining % when showRemaining=true', () => {
    render(<UsageCard title="X" tag="t" pct={70} showRemaining />)
    expect(screen.getByText('30%')).toBeInTheDocument()
  })

  it('uses green at low %, orange mid, red high', () => {
    // jsdom normalizes hex to rgb(). Match either form.
    const matches = (bg, hex) => {
      const lower = bg.toLowerCase()
      if (lower.includes(hex.toLowerCase())) return true
      const [r, g, b] = [hex.slice(1, 3), hex.slice(3, 5), hex.slice(5, 7)].map((h) => parseInt(h, 16))
      return lower.includes(`rgb(${r}, ${g}, ${b})`)
    }
    const { rerender, container } = render(<UsageCard title="X" tag="t" pct={10} />)
    expect(matches(container.querySelector('.uc-bar-fill').style.background, '#10b981')).toBe(true)

    rerender(<UsageCard title="X" tag="t" pct={60} />)
    expect(matches(container.querySelector('.uc-bar-fill').style.background, '#F65D1F')).toBe(true)

    rerender(<UsageCard title="X" tag="t" pct={95} />)
    expect(matches(container.querySelector('.uc-bar-fill').style.background, '#ef4444')).toBe(true)
  })

  it('shows loading shimmer when loading', () => {
    const { container } = render(<UsageCard title="X" tag="t" pct={0} loading />)
    expect(container.querySelector('.usage-card--loading')).toBeTruthy()
  })

  it('omits the pace marker when resetAt is missing', () => {
    const { container } = render(<UsageCard title="X" tag="t" pct={50} />)
    expect(container.querySelector('.uc-marker')).toBeNull()
  })
})
