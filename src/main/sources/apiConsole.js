// Anthropic Console — admin API key (sk-ant-admin01-...) → usage_report.
// Returns monthly cost + last-30-day daily series + per-model and per-key breakdowns.
const { net } = require('electron')

const BASE = 'https://api.anthropic.com/v1'

function req(url, headers, method = 'GET', body = null) {
  return new Promise((resolve, reject) => {
    const r = net.request({ url, method })
    Object.entries(headers).forEach(([k, v]) => r.setHeader(k, v))
    if (body) r.write(JSON.stringify(body))
    r.on('response', (res) => {
      const chunks = []
      res.on('data', (c) => chunks.push(c))
      res.on('end', () => {
        const text = Buffer.concat(chunks).toString('utf-8')
        try { resolve({ status: res.statusCode, data: JSON.parse(text) }) }
        catch { resolve({ status: res.statusCode, data: text }) }
      })
    })
    r.on('error', reject)
    r.end()
  })
}

function headers(adminKey) {
  return {
    'x-api-key': adminKey,
    'anthropic-version': '2023-06-01',
    'Content-Type': 'application/json',
  }
}

function startOfMonthIso() {
  const d = new Date()
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1)).toISOString()
}

function daysAgoIso(n) {
  const d = new Date()
  d.setUTCDate(d.getUTCDate() - n)
  d.setUTCHours(0, 0, 0, 0)
  return d.toISOString()
}

async function fetchCost(adminKey) {
  const url = `${BASE}/organizations/cost_report?starting_at=${encodeURIComponent(startOfMonthIso())}&group_by[]=workspace_id`
  const res = await req(url, headers(adminKey))
  if (res.status === 401 || res.status === 403) throw new Error('AUTH_EXPIRED')
  if (res.status !== 200) throw new Error(`HTTP ${res.status}: ${JSON.stringify(res.data).slice(0, 200)}`)
  return res.data
}

async function fetchDailyCost(adminKey, days = 30) {
  const url = `${BASE}/organizations/cost_report?starting_at=${encodeURIComponent(daysAgoIso(days))}&bucket_width=1d`
  const res = await req(url, headers(adminKey))
  if (res.status !== 200) throw new Error(`HTTP ${res.status}`)
  return res.data
}

async function fetchTokensByModel(adminKey, days = 30) {
  const url = `${BASE}/organizations/usage_report/messages?starting_at=${encodeURIComponent(daysAgoIso(days))}&group_by[]=model&bucket_width=1d`
  const res = await req(url, headers(adminKey))
  if (res.status !== 200) throw new Error(`HTTP ${res.status}`)
  return res.data
}

function aggregate(raw) {
  if (!raw?.data) return { total: 0, days: [] }
  let total = 0
  const days = []
  for (const bucket of raw.data) {
    const cost = (bucket.results ?? []).reduce((acc, r) => acc + (Number(r.amount?.amount ?? r.cost ?? 0)), 0)
    total += cost
    days.push({ date: bucket.starting_at, cost })
  }
  return { total, days }
}

async function getUsage(adminKey) {
  const [monthly, daily, byModel] = await Promise.all([
    fetchCost(adminKey),
    fetchDailyCost(adminKey, 30),
    fetchTokensByModel(adminKey, 30).catch(() => null),
  ])
  const monthAgg = aggregate(monthly)
  const dailyAgg = aggregate(daily)

  // Top 3 models by token volume (input+output).
  let topModels = []
  if (byModel?.data) {
    const acc = {}
    for (const bucket of byModel.data) {
      for (const r of bucket.results ?? []) {
        const m = r.model ?? 'unknown'
        const tokens = (Number(r.input_tokens ?? 0)) + (Number(r.output_tokens ?? 0))
        acc[m] = (acc[m] ?? 0) + tokens
      }
    }
    topModels = Object.entries(acc).sort((a, b) => b[1] - a[1]).slice(0, 3)
      .map(([model, tokens]) => ({ model, tokens }))
  }

  return {
    monthCost: monthAgg.total,
    daily: dailyAgg.days,
    topModels,
  }
}

module.exports = { getUsage }
