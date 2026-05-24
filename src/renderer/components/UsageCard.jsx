import { useEffect, useRef, useState } from 'react'
import Countdown from './Countdown'

function getColor(pct, showRemaining = false) {
  const used = showRemaining ? 100 - pct : pct
  if (used >= 80) return '#ef4444'
  if (used >= 50) return '#F65D1F'
  return '#10b981'
}

function getElapsedFraction(resetAt, windowHours) {
  if (!resetAt || !windowHours) return null
  const resetMs = new Date(resetAt).getTime()
  const nowMs = Date.now()
  const windowMs = windowHours * 3600 * 1000
  const startMs = resetMs - windowMs
  const elapsed = (nowMs - startMs) / windowMs
  return Math.max(0, Math.min(1, elapsed))
}

function getPaceColor(usedPct, elapsedFraction) {
  if (elapsedFraction == null) return 'rgba(255,255,255,0.5)'
  const expectedPct = elapsedFraction * 100
  const ratio = usedPct / (expectedPct || 1)
  if (ratio > 1.5) return '#ef4444'
  if (ratio > 1.2) return '#f97316'
  if (ratio > 0.9) return '#facc15'
  if (ratio > 0.6) return '#4ade80'
  return '#22d3ee'
}

export default function UsageCard({
  title,
  tag,
  pct = 0,
  resetAt,
  windowHours,
  loading = false,
  showRemaining = false,
}) {
  const [displayed, setDisplayed] = useState(0)
  const timerRef = useRef(null)

  useEffect(() => {
    const target = Math.min(100, Math.max(0, pct))
    clearInterval(timerRef.current)
    const step = (target - displayed) / 18
    timerRef.current = setInterval(() => {
      setDisplayed((prev) => {
        const next = prev + step
        if (Math.abs(next - target) < 0.5) {
          clearInterval(timerRef.current)
          return target
        }
        return next
      })
    }, 40)
    return () => clearInterval(timerRef.current)
  }, [pct])

  const displayPct = showRemaining ? 100 - pct : pct
  const barWidth = showRemaining ? 100 - displayed : displayed
  const color = getColor(pct, showRemaining)
  const elapsed = getElapsedFraction(resetAt, windowHours)
  const paceColor = getPaceColor(pct, elapsed)

  if (loading) {
    return (
      <div className="usage-card usage-card--loading">
        <div className="uc-shimmer uc-shimmer--title" />
        <div className="uc-shimmer uc-shimmer--bar" />
      </div>
    )
  }

  return (
    <div className="usage-card">
      {/* Title row */}
      <div className="uc-header">
        <div className="uc-title-group">
          <span className="uc-title">{title}</span>
          {tag && <span className="uc-tag">{tag}</span>}
        </div>
        <span className="uc-pct" style={{ color }}>{Math.round(displayPct)}%</span>
      </div>

      {/* Progress bar */}
      <div className="uc-bar-track">
        <div
          className="uc-bar-fill"
          style={{
            width: `${Math.max(0, Math.min(100, barWidth))}%`,
            background: color,
            boxShadow: pct >= 80 ? `0 0 6px ${color}88` : 'none',
            transition: 'width 700ms ease, background 400ms ease',
          }}
        />
        {/* Pace / time marker */}
        {elapsed != null && (
          <div
            className="uc-marker"
            style={{
              left: `${elapsed * 100}%`,
              background: paceColor,
              boxShadow: `0 0 4px ${paceColor}`,
            }}
            title={`${Math.round(elapsed * 100)}% of window elapsed`}
          />
        )}
      </div>

      {/* Reset time */}
      <div className="uc-footer">
        {resetAt ? (
          <span className="uc-reset">Resets in <Countdown resetAt={resetAt} /></span>
        ) : (
          <span className="uc-reset">—</span>
        )}
        {elapsed != null && (
          <span className="uc-elapsed">{Math.round(elapsed * 100)}% window used</span>
        )}
      </div>
    </div>
  )
}
