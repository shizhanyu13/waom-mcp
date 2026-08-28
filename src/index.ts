#!/usr/bin/env node

/**
 * `@shizhanyu13/waom-mcp` — a cross-platform MCP server that exposes the
 * Ironbound WAOM autonomous-ops loop as four tools:
 *
 *   - `monitor`  probe an HTTP health endpoint (reachable + healthy gate)
 *   - `decide`   turn a health snapshot into a fix decision (heuristic)
 *   - `fix`      build the fix instruction for the host agent to act on
 *   - `verify`   re-probe and independently evaluate (GAN-style)
 *
 * Unlike the DSH plugin, this MCP server has no subagent executor — the
 * *host agent* (Claude Code / Codex / Cursor) is the executor, and drives the
 * loop by calling these tools. It runs over stdio, so `npx @shizhanyu13/waom-mcp`
 * works in any MCP-capable client.
 *
 * @module @shizhanyu13/waom-mcp
 */

import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { z } from 'zod'

import {
  buildFixPrompt,
  evaluate,
  heuristicDecide,
  probe,
  type Decision,
  type Evaluation,
  type ProbeResult,
  type WaomMonitor,
} from './waom.js'

const VERSION = '0.1.0'

/** Render any result so a host agent can read it without guessing. */
function toText(label: string, data: unknown): string {
  return `${label}\n${JSON.stringify(data, null, 2)}`
}

export function createServer(): McpServer {
  const server = new McpServer({ name: 'waom', version: VERSION })

  server.tool(
    'monitor',
    'Probe an HTTP health endpoint (HEAD). Returns reachable/healthy; the happy-path gate is HTTP reachable + expected healthy code.',
    {
      id: z.string().describe('monitor id'),
      url: z.string().describe('health URL to probe'),
      healthyCode: z.number().optional().describe('expected healthy HTTP status (default 200)'),
    },
    async ({ id, url, healthyCode }) => {
      const result = await probe({ id, url, healthyCode } as WaomMonitor)
      return { content: [{ type: 'text' as const, text: toText('monitor', { id, ...result }) }] }
    },
  )

  server.tool(
    'decide',
    'Turn a health snapshot into a fix decision. Pass a probe result (healthy flag) or let the server assess a URL.',
    {
      healthy: z.boolean().optional().describe('healthy flag from a prior monitor call'),
      id: z.string().optional().describe('monitor id (only with url)'),
      url: z.string().optional().describe('URL to assess if healthy is not given'),
      healthyCode: z.number().optional().describe('expected healthy status (only with url)'),
    },
    async ({ healthy, id, url, healthyCode }) => {
      if (typeof healthy === 'boolean') {
        const decision = heuristicDecide(healthy)
        return { content: [{ type: 'text' as const, text: toText('decide', decision) }] }
      }
      if (url) {
        const result = await probe({ id: id ?? url, url, healthyCode } as WaomMonitor)
        const decision = heuristicDecide(result.healthy)
        return { content: [{ type: 'text' as const, text: toText('decide', { ...result, decision }) }] }
      }
      throw new Error('decide: provide either `healthy` or `url`')
    },
  )

  server.tool(
    'fix',
    'Build the fix instruction for the host agent to act on. Consumes the decision from `decide`.',
    {
      action: z.string().describe('action to take (e.g. fix)'),
      rootCause: z.string().optional().describe('root cause from the decision'),
      constraints: z.array(z.string()).optional().describe('surgical constraints to append'),
    },
    async ({ action, rootCause, constraints }) => {
      const decision: Decision = { needs_fix: true, action, root_cause: rootCause }
      const prompt = buildFixPrompt(decision, constraints)
      return { content: [{ type: 'text' as const, text: prompt }] }
    },
  )

  server.tool(
    'verify',
    'Re-probe a target and independently evaluate whether it is healthy after a fix (GAN-style).',
    {
      id: z.string().describe('monitor id'),
      url: z.string().describe('health URL to re-probe'),
      healthyCode: z.number().optional().describe('expected healthy status (default 200)'),
    },
    async ({ id, url, healthyCode }) => {
      const probeAfter = await probe({ id, url, healthyCode } as WaomMonitor)
      const evaluation = evaluate(probeAfter)
      return {
        content: [{ type: 'text' as const, text: toText('verify', { id, ...probeAfter, ...evaluation }) }],
      }
    },
  )

  return server
}

// Entry point: run as a stdio MCP server when executed directly (bin).
// Guarded so importing this module elsewhere doesn't open a transport.
// `pathToFileURL` keeps the comparison correct across platform paths (Windows
// drive letters, POSIX, symlinks) — a raw `file://${argv[1]}` string compare
// breaks on Windows (`file://E:/` vs `file:///E:/`).
const invokedAsCli =
  !!process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href

if (invokedAsCli) {
  const server = createServer()
  const transport = new StdioServerTransport()
  await server.connect(transport)
}

// Re-export the pure logic so consumers/tests can use it without the SDK.
export { buildFixPrompt, evaluate, heuristicDecide, probe }
export type { Decision, Evaluation, ProbeResult, WaomMonitor }
