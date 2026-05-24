import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import fs from 'fs'
import os from 'os'
import path from 'path'

// Build a temp ~/.claude/projects sandbox before requiring the module so its
// captured ROOT constant points to our fixture.
let tmpHome
beforeEach(() => {
  tmpHome = fs.mkdtempSync(path.join(os.tmpdir(), 'cut-test-'))
  vi.spyOn(os, 'homedir').mockReturnValue(tmpHome)
  vi.resetModules()
})

afterEach(() => {
  vi.restoreAllMocks()
  fs.rmSync(tmpHome, { recursive: true, force: true })
})

function write(rel, lines) {
  const full = path.join(tmpHome, '.claude', 'projects', rel)
  fs.mkdirSync(path.dirname(full), { recursive: true })
  fs.writeFileSync(full, lines.map((l) => JSON.stringify(l)).join('\n'), 'utf-8')
}

describe('sources/cli', () => {
  it('returns zeros when ~/.claude/projects does not exist', async () => {
    const cli = await import('../../src/main/sources/cli.js')
    const r = cli.scan()
    expect(r.fileCount).toBe(0)
    expect(r.all.input).toBe(0)
  })

  it('sums tokens across multiple jsonl files', async () => {
    const now = new Date().toISOString()
    write('-Users-cuty-projectA/conversation-1.jsonl', [
      { timestamp: now, message: { usage: { input_tokens: 100, output_tokens: 50, cache_read_input_tokens: 25 } } },
      { timestamp: now, message: { usage: { input_tokens: 200, output_tokens: 75 } } },
    ])
    write('-Users-cuty-projectB/conversation-1.jsonl', [
      { timestamp: now, message: { usage: { input_tokens: 10, output_tokens: 5 } } },
    ])
    const cli = await import('../../src/main/sources/cli.js')
    const r = cli.scan()
    expect(r.fileCount).toBe(2)
    expect(r.all.input).toBe(310)
    expect(r.all.output).toBe(130)
    expect(r.all.cacheRead).toBe(25)
  })

  it('separates today vs lifetime totals', async () => {
    const today = new Date().toISOString()
    const old = new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString()  // 2 days ago
    write('-A/c1.jsonl', [
      { timestamp: today, message: { usage: { input_tokens: 100, output_tokens: 50 } } },
      { timestamp: old,   message: { usage: { input_tokens: 999, output_tokens: 999 } } },
    ])
    const cli = await import('../../src/main/sources/cli.js')
    const r = cli.scan()
    expect(r.today.input).toBe(100)
    expect(r.today.output).toBe(50)
    expect(r.all.input).toBe(1099)
  })

  it('top projects are sorted by most-recent activity', async () => {
    const a = new Date(Date.now() - 60_000).toISOString()
    const b = new Date(Date.now() - 30_000).toISOString()
    const c = new Date().toISOString()
    write('-A/x.jsonl', [{ timestamp: a, message: { usage: { input_tokens: 1, output_tokens: 1 } } }])
    write('-B/x.jsonl', [{ timestamp: c, message: { usage: { input_tokens: 1, output_tokens: 1 } } }])
    write('-C/x.jsonl', [{ timestamp: b, message: { usage: { input_tokens: 1, output_tokens: 1 } } }])
    const cli = await import('../../src/main/sources/cli.js')
    const r = cli.scan()
    expect(r.topProjects.map((p) => p.project)).toEqual(['B', 'C', 'A'])
  })

  it('tolerates malformed jsonl lines', async () => {
    const now = new Date().toISOString()
    const full = path.join(tmpHome, '.claude', 'projects', '-X', 'c.jsonl')
    fs.mkdirSync(path.dirname(full), { recursive: true })
    fs.writeFileSync(full, [
      '{ this is not json',
      JSON.stringify({ timestamp: now, message: { usage: { input_tokens: 10, output_tokens: 5 } } }),
      'also not json',
    ].join('\n'))
    const cli = await import('../../src/main/sources/cli.js')
    const r = cli.scan()
    expect(r.all.input).toBe(10)
    expect(r.all.output).toBe(5)
  })

  it('caches the result; getUsage hits the cache after scan', async () => {
    const now = new Date().toISOString()
    write('-A/c.jsonl', [{ timestamp: now, message: { usage: { input_tokens: 7, output_tokens: 3 } } }])
    const cli = await import('../../src/main/sources/cli.js')
    cli.scan()
    write('-A/c.jsonl', [{ timestamp: now, message: { usage: { input_tokens: 999, output_tokens: 999 } } }])
    const cached = cli.getUsage()
    expect(cached.all.input).toBe(7)
  })
})
