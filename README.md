# waom-mcp

> **Cross-platform Ironbound WAOM.** A [Model Context Protocol](https://modelcontextprotocol.io) server that exposes the autonomous-ops loop — **monitor → decide → fix → verify** — as four tools, for **Claude Code, Codex, and Cursor**.

[![npm version](https://img.shields.io/npm/v/@shizhanyu13/waom-mcp?style=flat-square)](https://www.npmjs.com/package/@shizhanyu13/waom-mcp)
[![npm downloads](https://img.shields.io/npm/dm/@shizhanyu13/waom-mcp?style=flat-square)](https://www.npmjs.com/package/@shizhanyu13/waom-mcp)
[![License: MIT](https://img.shields.io/badge/license-MIT-brightgreen)](/LICENSE)
[![MCP](https://img.shields.io/badge/MCP-stdio-purple)](https://modelcontextprotocol.io)
[![ESM](https://img.shields.io/badge/module-ESM-purple)](/package.json)

> 🚀 **Run it:** `npx @shizhanyu13/waom-mcp`

---

## Why this exists

The classic WAOM loop — *Watch, Assess, Operate, Maintain* — says: detect it, fix it, verify it. `@shizhanyu13/dsh-waom` does that loop **inside the DeepSeek Harness**, driving a DSH subagent to execute the fix. But that ties the loop to DSH.

`@shizhanyu13/waom-mcp` unlocks the **same reasoning** for any MCP-capable agent. It ports the pure decision/evaluation logic from `dsh-waom` and exposes it as four tools. **You don't need DSH, and you don't need a subagent** — the *host agent* (Claude Code, Codex, Cursor) is the executor. The MCP server is the brain; the host is the hands.

> **Division of labor**
> - **waom-mcp (this package)** — the senses + planner + verifier: it probes a target, decides whether a fix is needed, hands the host a fix instruction, and independently re-verifies.
> - **Host agent** — the executor: it calls `monitor → decide → fix → verify`, and when `fix` returns an instruction, *it* applies the fix with its own tools, then confirms with `verify`.

---

## Quickstart

Add to your MCP client config.

### Claude Code (`.mcp.json`)

```json
{
  "mcpServers": {
    "waom": {
      "command": "npx",
      "args": ["-y", "@shizhanyu13/waom-mcp"]
    }
  }
}
```

### Codex (`config.toml`)

```toml
[mcp_servers.waom]
command = "npx"
args = ["-y", "@shizhanyu13/waom-mcp"]
```

### Cursor

Settings → MCP → **+ Add new MCP server** → name `waom`, command `npx`, args `["-y", "@shizhanyu13/waom-mcp"]`.

---

## Tools

| tool | purpose | inputs |
|---|---|---|
| `monitor` | Probe an HTTP health endpoint (HEAD). Returns `reachable` + `healthy`. | `id`, `url`, `healthyCode?` |
| `decide` | Turn a health snapshot into a fix decision (heuristic fallback). | `healthy?` **or** `id`+`url` |
| `fix` | Build the fix instruction for the host agent to act on. | `action`, `rootCause?`, `constraints?` |
| `verify` | Re-probe a target and independently evaluate it (GAN-style). | `id`, `url`, `healthyCode?` |

The happy-path gate is **HTTP reachable + healthy code** (default `200`).

---

## The loop (let the host drive it)

```text
monitor(id, url)        → { reachable, healthy }
decide(healthy: false)  → { needs_fix: true, action: "fix", root_cause: "target unhealthy" }
fix(action, rootCause)  → "[WAOM fix] fix: target unhealthy\n..."
  … host applies the fix …
verify(id, url)         → { passed: true, reason: "target healthy after fix" }
```

This is deliberately four small tools, not one opaque `run`: the host keeps control of *what* to fix and *how*, while waom supplies the *detection*, *decision*, and *independent confirmation*.

---

## Default behavior

- **Inert until called** — the server only responds to MCP tool calls. No background ticker, no surprises.
- **Pure, DSH-free** — 0 DeepSeek Harness deps. Works anywhere Node 20+ runs.

---

## Relationship to `@shizhanyu13/dsh-waom`

`dsh-waom` is the same loop **inside DSH** (its fix executor is a DSH subagent). `waom-mcp` reuses the pure `probe` / `heuristicDecide` / `evaluate` / `buildFixPrompt` functions and swaps the execution layer for "the host agent". Upgrade `dsh-waom`'s logic → the same decisions land in `waom-mcp`'s tools.

---

## License

MIT
