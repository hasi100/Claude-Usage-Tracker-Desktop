import { useState, useEffect } from 'react'
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native'
import { CameraView, useCameraPermissions } from 'expo-camera'
import { genKeypair, toB64 } from './crypto'

export default function PairScreen({ onPaired }) {
  const [permission, requestPermission] = useCameraPermissions()
  const [busy, setBusy] = useState(false)
  const [scanned, setScanned] = useState(false)

  useEffect(() => {
    if (!permission) return
    if (!permission.granted) requestPermission()
  }, [permission])

  const handleScan = async ({ data }) => {
    if (scanned || busy) return
    setScanned(true); setBusy(true)
    try {
      const qr = JSON.parse(data)
      if (qr.v !== 1) throw new Error('Unsupported QR version')
      const kp = genKeypair()
      const res = await fetch(`${qr.url}/pair`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: qr.token,
          pubkey: toB64(kp.publicKey),
          name: 'Mobile',
        }),
      })
      const body = await res.json()
      if (!body.ok) throw new Error(body.error ?? 'Pair failed')
      onPaired({
        url: qr.url,
        fp: qr.fp,
        server_pk: qr.pubkey,
        m_sk: toB64(kp.secretKey),
        deviceId: body.deviceId,
      })
    } catch (e) {
      Alert.alert('Pairing failed', String(e.message ?? e))
      setScanned(false)
    } finally {
      setBusy(false)
    }
  }

  if (!permission?.granted) {
    return (
      <View style={styles.center}>
        <Text style={styles.title}>Camera access needed</Text>
        <TouchableOpacity style={styles.btn} onPress={requestPermission}>
          <Text style={styles.btnText}>Grant permission</Text>
        </TouchableOpacity>
      </View>
    )
  }

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <Text style={styles.title}>Pair with Desktop</Text>
        <Text style={styles.subtitle}>Open Settings → Mobile on the desktop and scan the QR.</Text>
      </View>
      <CameraView
        style={styles.cam}
        barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
        onBarcodeScanned={handleScan}
      />
      {busy && <Text style={styles.busy}>Pairing…</Text>}
    </View>
  )
}

const styles = StyleSheet.create({
  root:     { flex: 1, backgroundColor: '#15151a' },
  center:   { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#15151a', padding: 24 },
  header:   { padding: 18, paddingTop: 56 },
  title:    { color: '#fff', fontSize: 20, fontWeight: '700' },
  subtitle: { color: '#9a9aa6', fontSize: 13, marginTop: 4 },
  cam:      { flex: 1, margin: 18, borderRadius: 14, overflow: 'hidden' },
  busy:     { color: '#F65D1F', textAlign: 'center', padding: 12, fontSize: 14, fontWeight: '600' },
  btn:      { backgroundColor: '#F65D1F', padding: 12, borderRadius: 10, marginTop: 12 },
  btnText:  { color: '#fff', fontWeight: '700' },
})
