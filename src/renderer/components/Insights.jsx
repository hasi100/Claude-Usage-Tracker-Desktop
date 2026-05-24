export default function Insights({ usage }) {
  if (!usage) return null

  const { session = 0, weekly = 0, design = 0 } = usage
  const insights = []

  if (session >= 90)
    insights.push({ icon: '🔴', text: 'Session limit nearly reached — slow down or wait for reset' })
  else if (session >= 70)
    insights.push({ icon: '🟡', text: 'Session usage high — consider pacing your requests' })

  if (weekly >= 90)
    insights.push({ icon: '🔴', text: 'Weekly limit critical — resets Monday' })
  else if (weekly >= 70)
    insights.push({ icon: '🟡', text: 'Weekly usage elevated' })

  if (design >= 50)
    insights.push({ icon: '🟠', text: 'Opus usage above 50% — use Sonnet for lighter tasks' })

  if (session < 20 && weekly < 20)
    insights.push({ icon: '🟢', text: 'Usage looks great — plenty of capacity remaining' })

  if (insights.length === 0) return null

  return (
    <div className="insights">
      {insights.map((ins, i) => (
        <div key={i} className="insight-row">
          <span className="insight-icon">{ins.icon}</span>
          <span className="insight-text">{ins.text}</span>
        </div>
      ))}
    </div>
  )
}
