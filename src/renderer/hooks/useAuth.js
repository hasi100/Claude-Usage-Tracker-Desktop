import { useState, useEffect } from 'react'

export function useAuth() {
  const [authState, setAuthState] = useState(null)

  useEffect(() => {
    async function init() {
      const state = await window.electronAPI?.getAuthState?.()
      setAuthState(state ?? { method: null, connected: false })
    }
    init()
  }, [])

  return { authState, setAuthState }
}
