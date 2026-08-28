import { describe, expect, it } from 'vitest'

import {
  buildFixPrompt,
  evaluate,
  heuristicDecide,
  probe,
  type WaomMonitor,
} from '../src/waom.js'

/** A minimal fake fetch that returns the given status. */
function fakeFetch(status: number): typeof fetch {
  return (async () =>
    ({
      status,
      ok: status >= 200 && status < 300,
    }) as Response) as typeof fetch
}

/** A fake fetch that always throws (network error / timeout). */
function throwingFetch(): typeof fetch {
  return (async () => {
    throw new Error('network down')
  }) as unknown as typeof fetch
}

describe('probe', () => {
  it('marks a 200 target as reachable+healthy', async () => {
    const r = await probe({ id: 'a', url: 'http://x/health' }, fakeFetch(200))
    expect(r).toEqual({ status: 200, reachable: true, healthy: true })
  })

  it('respects a custom healthyCode', async () => {
    const r = await probe({ id: 'a', url: 'http://x/health', healthyCode: 204 }, fakeFetch(204))
    expect(r.healthy).toBe(true)
  })

  it('marks a non-matching status unhealthy', async () => {
    const r = await probe({ id: 'a', url: 'http://x/health' }, fakeFetch(503))
    expect(r).toEqual({ status: 503, reachable: true, healthy: false })
  })

  it('treats a thrown fetch as unreachable+unhealthy', async () => {
    const r = await probe({ id: 'a', url: 'http://x/health' }, throwingFetch())
    expect(r).toEqual({ status: 0, reachable: false, healthy: false })
  })
})

describe('heuristicDecide', () => {
  it('does not need a fix when healthy', () => {
    expect(heuristicDecide(true)).toEqual({ needs_fix: false, confidence: 1 })
  })

  it('needs a fix when unhealthy', () => {
    const d = heuristicDecide(false)
    expect(d.needs_fix).toBe(true)
    expect(d.action).toBe('fix')
  })
})

describe('evaluate', () => {
  it('passes only when the target is healthy after fix', () => {
    expect(evaluate({ status: 200, reachable: true, healthy: true })).toEqual({
      passed: true,
      reason: 'target healthy after fix',
    })
    expect(evaluate({ status: 503, reachable: true, healthy: false }).passed).toBe(false)
  })
})

describe('buildFixPrompt', () => {
  it('builds a fix instruction with constraints', () => {
    const prompt = buildFixPrompt(
      { needs_fix: true, action: 'fix', root_cause: 'target unhealthy' },
      ['restart the service', 'do not scale'],
    )
    expect(prompt).toContain('[WAOM fix] fix: target unhealthy')
    expect(prompt).toContain('restart the service')
    expect(prompt).toContain('do not scale')
  })
})
