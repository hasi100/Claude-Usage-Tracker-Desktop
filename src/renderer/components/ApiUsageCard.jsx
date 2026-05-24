import { useEffect, useState } from 'react'

function money(n) {
  if (n == null) return '—'
  return `$${Number(n).toFixed(2)}`
}

export default function ApiUsageCard({ refreshInterval }) {
  const [data, setData] = useState(null)
  const [err, setErr] = useState(null)
  const [loading, setLoading] = useState(false)

  const fetchIt = async () => {
    setLoading(true)
    const r = await window.electronAPI?.fetchApiUsage?.()
    if (r?.ok) { setData(r.data); setErr(null) }
    else { setErr(r?.error ?? 'failed') }
    setLoading(false)
  }

  useEffect(() => {
    fetchIt()
    const t = setInterval(fetchIt, Math.max(60, refreshInterval ?? 60) * 1000)
    return () => clearInterval(t)
  }, [refreshInterval])

  // mini sparkline for last-N daily costs
  const series = (data?.daily ?? []).map((d) => d.cost ?? 0)
  const max = Math.max(0.0001, ...series)

  return (
    <div className="usage-card">
      <div className="uc-header">
        <div className="uc-title-group">
          <span className="uc-title">API Console</span>
          <span className="uc-tag">Month-to-date</span>
        </div>
        <span className="uc-pct">{loading ? '…' : money(data?.monthCost)}</span>
      </div>

      {err === 'NO_ADMIN_KEY' ? (
        <div className="uc-empty">Add an admin API key in Settings → Auth</div>
      ) : err ? (
        <div className="uc-empty">⚠ {err}</div>
      ) : (
        <>
          <div className="spark">
            {series.slice(-30).map((v, i) => (
              <div
                key={i}
                className="spark-bar"
                style={{ height: `${Math.max(2, (v / max) * 100)}%` }}
              />
            ))}
          </div>
          {data?.topModels?.length > 0 && (
            <div className="uc-footer uc-models">
              {data.topModels.map((m) => (
                <span key={m.model} className="uc-tag" title={m.model}>
                  {m.model.split('-').slice(1, 3).join('-')} · {(m.tokens / 1_000_000).toFixed(1)}M
                </span>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}
