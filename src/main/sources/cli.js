// Claude Code CLI usage — read ~/.claude/projects/**/conversation-*.jsonl
// Sum tokens per day / per project. Watch for live updates.
const fs = require('fs')
const path = require('path')
const os = require('os')
const chokidar = require('chokidar')

const ROOT = path.join(os.homedir(), '.claude', 'projects')

let cache = null
let watcher = null
let onUpdateCb = null

function projectsRoot() { return ROOT }

function listJsonl(root = ROOT) {
  if (!fs.existsSync(root)) return []
  const out = []
  function walk(dir) {
    let entries
    try { entries = fs.readdirSync(dir, { withFileTypes: true }) } catch { return }
    for (const e of entries) {
      const p = path.join(dir, e.name)
      if (e.isDirectory()) walk(p)
      else if (e.isFile() && e.name.endsWith('.jsonl')) out.push(p)
    }
  }
  walk(root)
  return out
}

function parseFile(filepath) {
  const stats = { input: 0, output: 0, cacheCreate: 0, cacheRead: 0, lastTs: 0, model: null }
  let text
  try { text = fs.readFileSync(filepath, 'utf-8') } catch { return stats }
  for (const line of text.split('\n')) {
    if (!line.trim()) continue
    let obj
    try { obj = JSON.parse(line) } catch { continue }
    const u = obj?.message?.usage ?? obj?.usage
    if (!u) continue
    stats.input       += Number(u.input_tokens ?? 0)
    stats.output      += Number(u.output_tokens ?? 0)
    stats.cacheCreate += Number(u.cache_creation_input_tokens ?? 0)
    stats.cacheRead   += Number(u.cache_read_input_tokens ?? 0)
    if (obj?.message?.model) stats.model = obj.message.model
    const ts = obj?.timestamp ? Date.parse(obj.timestamp) : 0
    if (ts > stats.lastTs) stats.lastTs = ts
  }
  return stats
}

function isToday(ms) {
  const d = new Date(ms)
  const n = new Date()
  return d.getFullYear() === n.getFullYear() && d.getMonth() === n.getMonth() && d.getDate() === n.getDate()
}

function projectName(filepath) {
  // ~/.claude/projects/<encoded-cwd>/conversation-*.jsonl
  const rel = path.relative(ROOT, filepath)
  const parts = rel.split(path.sep)
  return parts[0]?.replace(/^-/, '').replace(/-/g, '/') ?? 'unknown'
}

function scan() {
  const files = listJsonl()
  const today = { input: 0, output: 0, cacheCreate: 0, cacheRead: 0 }
  const all   = { input: 0, output: 0, cacheCreate: 0, cacheRead: 0 }
  const byProj = {}
  let lastSession = 0

  for (const f of files) {
    const s = parseFile(f)
    const p = projectName(f)
    byProj[p] = byProj[p] ?? { project: p, tokens: 0, lastTs: 0 }
    byProj[p].tokens += s.input + s.output
    if (s.lastTs > byProj[p].lastTs) byProj[p].lastTs = s.lastTs
    if (s.lastTs > lastSession) lastSession = s.lastTs

    all.input += s.input
    all.output += s.output
    all.cacheCreate += s.cacheCreate
    all.cacheRead += s.cacheRead
    if (isToday(s.lastTs)) {
      today.input += s.input
      today.output += s.output
      today.cacheCreate += s.cacheCreate
      today.cacheRead += s.cacheRead
    }
  }

  const topProjects = Object.values(byProj)
    .sort((a, b) => b.lastTs - a.lastTs)
    .slice(0, 3)

  cache = { today, all, topProjects, lastSession, fileCount: files.length }
  return cache
}

function getUsage() {
  if (cache) return cache
  return scan()
}

function startWatch(cb) {
  onUpdateCb = cb
  if (watcher || !fs.existsSync(ROOT)) return
  watcher = chokidar.watch(ROOT, {
    ignored: /(^|[\/\\])\../,
    ignoreInitial: true,
    persistent: true,
    depth: 5,
  })
  const trigger = () => {
    const next = scan()
    onUpdateCb?.(next)
  }
  watcher.on('add', trigger).on('change', trigger).on('unlink', trigger)
}

function stopWatch() {
  if (watcher) { watcher.close(); watcher = null }
  onUpdateCb = null
}

module.exports = { getUsage, scan, startWatch, stopWatch, projectsRoot }
