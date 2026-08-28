/**
 * Pure Ironbound WAOM loop logic for the `@shizhanyu13/waom-mcp` MCP server.
 *
 * These are the DSH-independent functions ported verbatim from
 * `@shizhanyu13/dsh-waom` (src/index.ts): probe, heuristicDecide, evaluate,
 * buildFixPrompt. The difference is scope — here there is no DSH subagent
 * executor, so the MCP *host agent* (Claude Code / Codex / Cursor) is the
 * executor and consumes the four tools to drive the loop itself.
 *
 * @module @shizhanyu13/waom-mcp/waom
 */

/** One monitored target. */
export interface WaomMonitor {
  id: string
  /** URL to probe; reachable+healthy is the happy-path gate. */
  url: string
  /** Expected healthy HTTP status (default 200). */
  healthyCode?: number
  /** Whether an independent fix+verify cycle may run when unhealthy. */
  fixable?: boolean
}

/** The result of probing one monitor. */
export interface ProbeResult {
  status: number
  reachable: boolean
  healthy: boolean
}

/** A decision the planner reaches for one probe. */
export interface Decision {
  needs_fix?: boolean
  root_cause?: string
  action?: string
  confidence?: number
}

/** Independent GAN-style evaluation result. */
export interface Evaluation {
  passed: boolean
  reason: string
}

/** Default HTTP status that means a target is healthy. */
export const DEFAULT_HEALTHY_CODE = 200

/** Default probe timeout in ms. */
export const PROBE_TIMEOUT_MS = 5000

/**
 * Probe a monitor target; the happy-path gate is HTTP reachable + healthy code.
 * `fetchImpl` is injectable for tests; defaults to the global fetch.
 */
export async function probe(monitor: WaomMonitor, fetchImpl: typeof fetch = fetch): Promise<ProbeResult> {
  try {
    const res = await fetchImpl(monitor.url, {
      method: 'HEAD',
      signal: AbortSignal.timeout(PROBE_TIMEOUT_MS),
    })
    const healthy = res.status === (monitor.healthyCode ?? DEFAULT_HEALTHY_CODE)
    return { status: res.status, reachable: true, healthy }
  } catch {
    return { status: 0, reachable: false, healthy: false }
  }
}

/** A thresholded fallback decision when no LLM route is wired. */
export function heuristicDecide(healthy: boolean): Decision {
  return healthy
    ? { needs_fix: false, confidence: 1 }
    : { needs_fix: true, confidence: 0.55, action: 'fix', root_cause: 'target unhealthy' }
}

/**
 * Independent GAN-style evaluation: PASS only when the target is healthy after
 * a fix. Kept pure so it is directly testable (the real HTTP probe is injected).
 */
export function evaluate(probeAfter: ProbeResult): Evaluation {
  if (probeAfter.healthy) return { passed: true, reason: 'target healthy after fix' }
  return { passed: false, reason: `target still unhealthy (status ${probeAfter.status})` }
}

/** Build the fix instruction text from a decision + surgical constraints. */
export function buildFixPrompt(decision: Decision, constraints: string[] = []): string {
  return `[WAOM fix] ${decision.action}: ${decision.root_cause ?? ''}\n` + constraints.join('\n')
}

/**
 * Convenience: full monitor → decide → evaluate chain in one async step, as a
 * single static-analysis snapshot for a target. The host agent is still
 * responsible for acting on the fix.
 */
export async function assess(monitor: WaomMonitor, fetchImpl: typeof fetch = fetch): Promise<{
  probe: ProbeResult
  decision: Decision
  evaluation: Evaluation
}> {
  const result = await probe(monitor, fetchImpl)
  return {
    probe: result,
    decision: heuristicDecide(result.healthy),
    evaluation: evaluate(result),
  }
}
