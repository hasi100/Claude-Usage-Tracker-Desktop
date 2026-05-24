import Countdown from './Countdown'

function pctToColor(pct) {
  if (pct >= 90) return '#ef4444'
  if (pct >= 70) return '#facc15'
  return '#4ade80'
}

function nearestReset(usage) {
  if (!usage) return null
  const resets = [
    { at: usage.sessionReset, pct: usage.session },
    { at: usage.weeklyReset, pct: usage.weekly },
  ].filter((r) => r.at && r.pct > 0)

  if (resets.length === 0) return usage.sessionReset
  resets.sort((a, b) => new Date(a.at) - new Date(b.at))
  return resets[0].at
}

export default function MiniPill({ usage, onExpand }) {
  const session = usage?.session ?? 0
  const weekly = usage?.weekly ?? 0
  const design = usage?.design ?? 0
  const nearest = nearestReset(usage)

  return (
    <div className="mini-pill drag-region" onDoubleClick={onExpand}>
      <div className="mini-dots no-drag">
        <span className="mini-dot-item">
          <span className="mini-dot" style={{ background: pctToColor(session) }} />
          <span className="mini-pct">{Math.round(session)}%</span>
        </span>
        <span className="mini-dot-item">
          <span className="mini-dot" style={{ background: pctToColor(weekly) }} />
          <span className="mini-pct">{Math.round(weekly)}%</span>
        </span>
        <span className="mini-dot-item">
          <span className="mini-dot" style={{ background: pctToColor(design) }} />
          <span className="mini-pct">{Math.round(design)}%</span>
        </span>
      </div>
      <div className="mini-divider" />
      <span className="mini-countdown no-drag">
        {nearest ? <Countdown resetAt={nearest} /> : '—'}
      </span>
      <button className="mini-expand no-drag" onClick={onExpand} title="Expand">↑</button>
    </div>
  )
}
