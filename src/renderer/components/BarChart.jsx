import { useEffect, useState } from 'react'
import Countdown from './Countdown'

function pctToColor(pct) {
  if (pct >= 90) return '#ef4444'
  if (pct >= 70) return '#facc15'
  return '#4ade80'
}

export default function BarChart({ label, pct = 0, resetAt, loading = false }) {
  const [displayed, setDisplayed] = useState(0)

  useEffect(() => {
    const target = Math.min(100, Math.max(0, pct))
    const step = (target - displayed) / 20
    const timer = setInterval(() => {
      setDisplayed((prev) => {
        const next = prev + step
        if (Math.abs(next - target) < 0.5) { clearInterval(timer); return target }
        return next
      })
    }, 40)
    return () => clearInterval(timer)
  }, [pct])

  const color = pctToColor(pct)

  if (loading) {
    return (
      <div className="bar-row">
        <div className="bar-skeleton" />
      </div>
    )
  }

  return (
    <div className="bar-row">
      <div className="bar-meta">
        <span className="bar-label">{label}</span>
        <span className="bar-pct" style={{ color }}>{Math.round(pct)}%</span>
        <span className="bar-countdown">{resetAt ? <Countdown resetAt={resetAt} /> : '—'}</span>
      </div>
      <div className="bar-track">
        <div
          className="bar-fill"
          style={{
            width: `${displayed}%`,
            background: color,
            boxShadow: pct >= 90 ? `0 0 8px ${color}` : 'none',
            transition: 'width 800ms ease, box-shadow 400ms ease',
          }}
        />
      </div>
    </div>
  )
}
