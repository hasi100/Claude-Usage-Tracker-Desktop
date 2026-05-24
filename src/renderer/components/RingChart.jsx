import { useEffect, useState } from 'react'
import Countdown from './Countdown'

const SIZE = 72
const STROKE = 6
const R = (SIZE - STROKE) / 2
const CIRC = 2 * Math.PI * R

function pctToColor(pct) {
  if (pct >= 80) return '#ef4444'
  if (pct >= 50) return '#F65D1F'
  return '#10b981'
}

export default function RingChart({ label, pct = 0, resetAt, loading = false }) {
  const [displayed, setDisplayed] = useState(0)

  useEffect(() => {
    // Animate to new value
    const target = Math.min(100, Math.max(0, pct))
    if (displayed === target) return
    const step = (target - displayed) / 20
    const timer = setInterval(() => {
      setDisplayed((prev) => {
        const next = prev + step
        if (Math.abs(next - target) < 0.5) {
          clearInterval(timer)
          return target
        }
        return next
      })
    }, 40)
    return () => clearInterval(timer)
  }, [pct])

  const dashOffset = CIRC - (displayed / 100) * CIRC
  const color = pctToColor(pct)
  const isPulsing = pct >= 90

  if (loading) {
    return (
      <div className="ring-container">
        <div className="ring-skeleton" style={{ width: SIZE, height: SIZE }} />
        <span className="ring-label">{label}</span>
      </div>
    )
  }

  return (
    <div className="ring-container">
      <svg
        width={SIZE}
        height={SIZE}
        className={isPulsing ? 'ring-pulse' : ''}
      >
        {/* Background track */}
        <circle
          cx={SIZE / 2}
          cy={SIZE / 2}
          r={R}
          fill="none"
          stroke="rgba(255,255,255,0.06)"
          strokeWidth={STROKE}
        />
        {/* Progress arc */}
        <circle
          cx={SIZE / 2}
          cy={SIZE / 2}
          r={R}
          fill="none"
          stroke={color}
          strokeWidth={STROKE}
          strokeLinecap="round"
          strokeDasharray={CIRC}
          strokeDashoffset={dashOffset}
          transform={`rotate(-90 ${SIZE / 2} ${SIZE / 2})`}
          style={{ transition: 'stroke-dashoffset 800ms ease, stroke 400ms ease' }}
        />
        {/* Center text */}
        <text
          x="50%"
          y="50%"
          dominantBaseline="middle"
          textAnchor="middle"
          fill="white"
          fontSize="13"
          fontWeight="700"
          fontFamily="inherit"
        >
          {pct === 0 && label === 'Design' ? '—' : `${Math.round(pct)}%`}
        </text>
      </svg>
      <span className="ring-label">{label}</span>
      <span className="ring-countdown">
        {resetAt ? <Countdown resetAt={resetAt} /> : '—'}
      </span>
    </div>
  )
}
