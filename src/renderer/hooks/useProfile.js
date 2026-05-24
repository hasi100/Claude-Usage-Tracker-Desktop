import { useState, useEffect, useCallback } from 'react'

export function useProfile() {
  const [profiles, setProfiles] = useState([])
  const [activeId, setActiveId] = useState(null)

  const refresh = useCallback(async () => {
    const r = await window.electronAPI?.listProfiles?.()
    if (r) {
      setProfiles(r.profiles)
      setActiveId(r.activeId)
    }
  }, [])

  useEffect(() => { refresh() }, [refresh])

  const setActive = useCallback(async (id) => {
    await window.electronAPI?.setActiveProfile?.(id)
    await refresh()
  }, [refresh])

  const add = useCallback(async () => {
    await window.electronAPI?.addProfile?.()
    await refresh()
  }, [refresh])

  const remove = useCallback(async (id) => {
    await window.electronAPI?.deleteProfile?.(id)
    await refresh()
  }, [refresh])

  const update = useCallback(async (id, patch) => {
    await window.electronAPI?.updateProfile?.(id, patch)
    await refresh()
  }, [refresh])

  const active = profiles.find((p) => p.id === activeId) ?? null
  return { profiles, active, activeId, setActive, add, remove, update, refresh }
}
