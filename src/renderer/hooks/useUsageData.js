import { useState, useEffect, useRef, useCallback } from 'react'

function toPct(val) {
  if (val == null) return 0
  if (typeof val === 'string') val = parseFloat(val)
  return val <= 1 ? Math.round(val * 100) : Math.round(val)
}

// The claude.ai API's `utilization` field represents *remaining capacity*,
// not used. Their own website renders it as (1 - utilization) labelled
// "% used". We mirror that so what we display matches claude.ai.
function toUsedPct(val) {
  if (val == null) return 0
  return Math.max(0, Math.min(100, 100 - toPct(val)))
}

function parseUsage(raw) {
  if (!raw) return null

  // Actual field names from claude.ai API (confirmed from reference Swift app):
  //   five_hour.utilization   (0–1 decimal)
  //   five_hour.resets_at     (ISO 8601)
  //   seven_day.utilization
  //   seven_day.resets_at
  //   seven_day_opus.utilization
  //   seven_day_sonnet.utilization
  const fiveHour    = raw.five_hour ?? {}
  const sevenDay    = raw.seven_day ?? {}
  const sevenDayOpus = raw.seven_day_opus ?? {}

  return {
    session:      toUsedPct(fiveHour.utilization),
    sessionReset: fiveHour.resets_at ?? null,
    weekly:       toUsedPct(sevenDay.utilization),
    weeklyReset:  sevenDay.resets_at ?? null,
    design:       toUsedPct(sevenDayOpus.utilization),
    designReset:  sevenDayOpus.resets_at ?? null,
  }
}

export function useUsageData(authState) {
  const [usage, setUsage] = useState(null)
  const [isLoading, setIsLoading] = useState(false)
  const [lastUpdated, setLastUpdated] = useState(null)
  const [refreshInterval, setRefreshInterval] = useState(60)
  const timerRef = useRef(null)

  const fetchUsage = useCallback(async () => {
    if (!authState?.connected) return
    setIsLoading(true)
    try {
      const result = await window.electronAPI?.fetchUsage?.()
      console.log('[usage raw]', JSON.stringify(result?.data, null, 2))
      if (result?.ok && result.data) {
        setUsage(parseUsage(result.data))
        setLastUpdated(new Date())
      }
    } finally {
      setIsLoading(false)
    }
  }, [authState?.connected])

  // Load settings and start polling
  useEffect(() => {
    async function init() {
      const settings = await window.electronAPI?.getSettings?.()
      const interval = settings?.refreshInterval ?? 60
      setRefreshInterval(interval)
    }
    init()
  }, [])

  useEffect(() => {
    if (!authState?.connected) return

    fetchUsage()

    timerRef.current = setInterval(fetchUsage, refreshInterval * 1000)
    return () => clearInterval(timerRef.current)
  }, [authState?.connected, refreshInterval, fetchUsage])

  // Force refresh from tray
  useEffect(() => {
    const handler = () => fetchUsage()
    window.electronAPI?.onUsageUpdate?.(handler)
    // listen for force-refresh ipc event via custom dom event
    window.addEventListener('usage:force-refresh', handler)
    return () => window.removeEventListener('usage:force-refresh', handler)
  }, [fetchUsage])

  return { usage, isLoading, lastUpdated, refreshInterval, forceRefresh: fetchUsage }
}
