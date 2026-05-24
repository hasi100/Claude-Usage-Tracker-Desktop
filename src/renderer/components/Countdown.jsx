import { useState, useEffect } from 'react'

function formatDuration(ms) {
  if (ms <= 0) return 'now'
  const totalSec = Math.floor(ms / 1000)
  const h = Math.floor(totalSec / 3600)
  const m = Math.floor((totalSec % 3600) / 60)
  const s = totalSec % 60

  if (h > 0) return `${h}h ${m}m`
  if (m > 0) return `${m}m ${s}s`
  return `${s}s`
}

function formatResetLabel(resetAt) {
  const date = new Date(resetAt)
  const now = new Date()
  const diff = date - now

  if (diff <= 0) return 'now'

  const days = Math.floor(diff / 86400000)
  if (days >= 1) {
    const weekday = date.toLocaleDateString('en-US', { weekday: 'short' })
    const hour = date.toLocaleTimeString('en-US', { hour: 'numeric', hour12: true })
    return `${weekday} ${hour}`
  }

  return formatDuration(diff)
}

export default function Countdown({ resetAt }) {
  const [label, setLabel] = useState(() => formatResetLabel(resetAt))

  useEffect(() => {
    setLabel(formatResetLabel(resetAt))
    const interval = setInterval(() => {
      setLabel(formatResetLabel(resetAt))
    }, 1000)
    return () => clearInterval(interval)
  }, [resetAt])

  return <>{label}</>
}
