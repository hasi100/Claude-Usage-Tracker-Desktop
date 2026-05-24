import { useEffect, useState, useRef } from 'react'
import QRCode from 'qrcode'

export default function MobileTab() {
  const [pairing, setPairing] = useState(false)
  const [info, setInfo] = useState(null)
  const [devices, setDevices] = useState([])
  const [ttl, setTtl] = useState(0)
  const canvasRef = useRef(null)

  const refreshDevices = async () => {
    const d = await window.electronAPI?.pairDevices?.()
    setDevices(d ?? [])
  }

  useEffect(() => { refreshDevices() }, [])

  // Countdown to TTL expiry
  useEffect(() => {
    if (!info || !pairing) return
    setTtl(info.ttl ?? 120)
    const t = setInterval(() => {
      setTtl((s) => {
        if (s <= 1) {
          clearInterval(t)
          setPairing(false)
          setInfo(null)
          window.electronAPI?.pairStop?.()
          return 0
        }
        return s - 1
      })
    }, 1000)
    return () => clearInterval(t)
  }, [info, pairing])

  // Render QR
  useEffect(() => {
    if (!info || !canvasRef.current) return
    const payload = JSON.stringify({
      v: info.v,
      url: `https://${info.host}:${info.port}`,
      fp: info.fp,
      token: info.token,
      pubkey: info.pubkey,
    })
    QRCode.toCanvas(canvasRef.current, payload, {
      width: 200,
      color: { dark: '#ffffff', light: '#15151a' },
      margin: 1,
    })
  }, [info])

  const startPair = async () => {
    const r = await window.electronAPI?.pairStart?.()
    setInfo(r)
    setPairing(true)
    // poll device list while pairing in case someone scans
    const poll = setInterval(refreshDevices, 1500)
    setTimeout(() => clearInterval(poll), 130_000)
  }

  const cancelPair = async () => {
    await window.electronAPI?.pairStop?.()
    setPairing(false)
    setInfo(null)
  }

  const revoke = async (id) => {
    await window.electronAPI?.pairRevoke?.(id)
    refreshDevices()
  }

  return (
    <div className="tab-pane">
      <div className="tab-title">Mobile Pairing</div>

      {!pairing ? (
        <>
          <p className="tab-hint">
            Pair your phone to monitor usage on the go. Credentials never leave
            this device — the phone receives encrypted usage events over your
            local network.
          </p>
          <button className="settings-btn-primary" onClick={startPair}>
            Show Pairing QR
          </button>
        </>
      ) : (
        <div className="qr-block">
          <canvas ref={canvasRef} className="qr-canvas" />
          <div className="qr-meta">Expires in {ttl}s</div>
          <button className="settings-btn-secondary" onClick={cancelPair}>Cancel</button>
        </div>
      )}

      <div className="tab-divider" />

      <div className="settings-label">Paired Devices</div>
      {devices.length === 0 ? (
        <div className="settings-value-muted">No devices paired</div>
      ) : (
        <div className="devices-list">
          {devices.map((d) => (
            <div key={d.id} className="device-row">
              <div className="device-meta">
                <div className="device-name">{d.name}</div>
                <div className="device-seen">Last seen {new Date(d.lastSeen).toLocaleTimeString()}</div>
              </div>
              <button className="ctrl-btn" onClick={() => revoke(d.id)} title="Revoke">×</button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
