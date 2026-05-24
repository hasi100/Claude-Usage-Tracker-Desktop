import { useEffect, useState } from 'react'
import { StatusBar } from 'expo-status-bar'
import * as SecureStore from 'expo-secure-store'
import { View, Text, StyleSheet } from 'react-native'
import PairScreen from './src/PairScreen'
import DashboardScreen from './src/DashboardScreen'

export default function App() {
  const [pair, setPair] = useState(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    SecureStore.getItemAsync('pairing').then((raw) => {
      if (raw) setPair(JSON.parse(raw))
      setReady(true)
    })
  }, [])

  if (!ready) {
    return <View style={styles.center}><Text style={styles.text}>Loading…</Text></View>
  }

  return (
    <View style={styles.root}>
      <StatusBar style="light" />
      {pair
        ? <DashboardScreen pair={pair} onUnpair={() => { SecureStore.deleteItemAsync('pairing'); setPair(null) }} />
        : <PairScreen onPaired={(p) => { SecureStore.setItemAsync('pairing', JSON.stringify(p)); setPair(p) }} />}
    </View>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#15151a' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#15151a' },
  text: { color: '#fff' },
})
