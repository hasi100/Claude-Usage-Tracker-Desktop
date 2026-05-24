import { useEffect, useState } from 'react'

function fmt(n) {
  if (!n) return '0'
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`
  return String(n)
}

export default function CliUsageCard() {
  const [data, setData] = useState(null)

  useEffect(() => {
    const fetchIt = async () => {
      const r = await window.electronAPI?.fetchCliUsage?.()
      if (r?.ok) setData(r.data)
    }
    fetchIt()
    const off = window.electronAPI?.onCliUpdate?.((d) => setData(d))
    return () => off?.()
  }, [])

  const today = data?.today ?? { input: 0, output: 0 }
  const all = data?.all ?? { input: 0, output: 0 }
  const todayTotal = today.input + today.output
  const lifetimeTotal = all.input + all.output

  return (
    <div className="usage-card">
      <div className="uc-header">
        <div className="uc-title-group">
          <span className="uc-title">Claude Code CLI</span>
          <span className="uc-tag">Today</span>
        </div>
        <span className="uc-pct">{fmt(todayTotal)}</span>
      </div>

      <div className="cli-stats">
        <div className="cli-stat"><span>↑ in</span><b>{fmt(today.input)}</b></div>
        <div className="cli-stat"><span>↓ out</span><b>{fmt(today.output)}</b></div>
        <div className="cli-stat"><span>cache</span><b>{fmt(today.cacheRead)}</b></div>
      </div>

      {data?.topProjects?.length > 0 && (
        <div className="uc-footer uc-models">
          {data.topProjects.map((p) => (
            <span key={p.project} className="uc-tag" title={p.project}>
              {p.project.split(/[\\/]/).pop()} · {fmt(p.tokens)}
            </span>
          ))}
        </div>
      )}

      <div className="uc-footer">
        <span className="uc-reset">Lifetime: {fmt(lifetimeTotal)}</span>
        <span className="uc-elapsed">{data?.fileCount ?? 0} sessions</span>
      </div>
    </div>
  )
}
