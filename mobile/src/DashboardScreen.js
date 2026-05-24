import { useEffect, useState } from 'react'
import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from 'react-native'
import { decrypt, toUint8 } from './crypto'

// React Native doesn't ship EventSource. We poll the encrypted feed via fetch
// reading the body as a stream. For simplicity we use a long-poll fallback
// shaped like an SSE consumer.
async function* sseLines(url, token) {
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } })
  const reader = res.body.getReader()
  const decoder = new TextDecoder('utf-8')
  let buf = ''
  while (true) {
    const { value, done } = await reader.read()
    if (done) return
    buf += decoder.decode(value, { stream: true })
    let idx
    while ((idx = buf.indexOf('\n\n')) >= 0) {
      const frame = buf.slice(0, idx)
      buf = buf.slice(idx + 2)
      for (const line of frame.split('\n')) {
        if (line.startsWith('data: ')) yield line.slice(6)
      }
    }
  }
}

export default function DashboardScreen({ pair, onUnpair }) {
  const [events, setEvents] = useState({})  // event name → latest data
  const [status, setStatus] = useState('connecting')

  useEffect(() => {
    let cancelled = false
    const secretKey = toUint8(pair.m_sk)
    ;(async () => {
      try {
        setStatus('connecting')
        for await (const raw of sseLines(`${pair.url}/stream`, pair.deviceId)) {
          if (cancelled) return
          try {
            const payload = JSON.parse(raw)
            const plain = decrypt(payload, pair.server_pk, secretKey)
            if (!plain) continue
            setStatus('connected')
            setEvents((e) => ({ ...e, [plain.event]: plain.data }))
          } catch {}
        }
        if (!cancelled) setStatus('disconnected')
      } catch (e) {
        if (!cancelled) setStatus(`error: ${e.message}`)
      }
    })()
    return () => { cancelled = true }
  }, [pair])

  const web = events['web-usage']
  const api = events['api-usage']
  const cli = events['cli-usage']

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.title}>Claude Usage</Text>
        <TouchableOpacity onPress={onUnpair}><Text style={styles.unpair}>Unpair</Text></TouchableOpacity>
      </View>
      <Text style={styles.status}>{status}</Text>

      {web && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Web</Text>
          <Text style={styles.cardLine}>5h: {Math.round(((web.five_hour?.utilization ?? 0)) * 100)}%</Text>
          <Text style={styles.cardLine}>7d: {Math.round(((web.seven_day?.utilization ?? 0)) * 100)}%</Text>
          <Text style={styles.cardLine}>Opus: {Math.round(((web.seven_day_opus?.utilization ?? 0)) * 100)}%</Text>
        </View>
      )}

      {api && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>API Console</Text>
          <Text style={styles.cardLine}>Month: ${(api.monthCost ?? 0).toFixed(2)}</Text>
        </View>
      )}

      {cli && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>CLI Today</Text>
          <Text style={styles.cardLine}>↑ {cli.today?.input ?? 0}  ↓ {cli.today?.output ?? 0}</Text>
        </View>
      )}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  root:    { flex: 1, backgroundColor: '#15151a' },
  content: { padding: 18, paddingTop: 56 },
  header:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title:   { color: '#fff', fontSize: 22, fontWeight: '700' },
  unpair:  { color: '#F65D1F', fontSize: 12, fontWeight: '600' },
  status:  { color: '#9a9aa6', fontSize: 11, marginTop: 4, marginBottom: 12 },
  card:    { backgroundColor: '#1c1c22', borderRadius: 12, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)' },
  cardTitle: { color: '#fff', fontSize: 14, fontWeight: '700', marginBottom: 8 },
  cardLine:  { color: '#d4d4dc', fontSize: 13, marginVertical: 2 },
})
