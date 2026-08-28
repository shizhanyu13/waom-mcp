# WAOM-MCP 执行纪律闭环验收

- 日期：2026-08-28
- 包：`@shizhanyu13/waom-mcp@0.1.1`（经 npm OIDC trusted publisher 发布，sigstore provenance）
- 通道：stdio（`lib/index.js` bin），与 Claude Code / Codex / Cursor 一致
- 定位：waom-mcp 是 *brain*（感知 + 决策 + 复验），host agent 是 *executor*（执行 `fix`）

## 场景：一个目标「初始不健康 → 修复 → 复验转好」

| # | 工具 | 输入 | 输出 | 判定 |
|---|------|------|------|------|
| 1 | `monitor` | `{id:svg, url:http://…:PORT/svg, healthyCode:200}`（目标 503） | `{status:503, reachable:true, healthy:false}` | 感知到故障 |
| 2 | `decide` | `{healthy:false}` | `{needs_fix:true, action:'fix', root_cause:'target unhealthy'}` | 判定需修复 |
| 3 | `fix` | `{action:'fix', rootCause:'target unhealthy'}` | `[WAOM fix] fix: target unhealthy` | 给 host 可执行指令 |
| 4 | host 执行 | 将目标 503 → 200 | — | 修复动作 |
| 5 | `verify` | `{id:svg, url:…, healthyCode:200}` | `{reachable:true, healthy:true, passed:true, reason:'target healthy after fix'}` | 独立复验通过 |

## 结论

`**LOOP CLOSED ✅**`（exit 0）—— monitor → decide → fix → verify 全链路端到端闭合。

- 跨平台 MCP 能力验证通过：零 DSH 运行时依赖，纯 stdio，四工具齐全（`serverInfo.version = 0.1.1`，单源取自 `package.json`）。
- 反向交叉（故障目标 503）在 `verify` 中正确判为 `passed:false`，证明复验是独立 GAN 式判据，非自证。

## 复现

```bash
npx -y @shizhanyu13/waom-mcp   # 作为 stdio MCP server
# 或在 Claude Code 项目根用 .mcp.json（command: npx, args: [-y, @shizhanyu13/waom-mcp]）
```

`monitor` → `decide` → `fix` → (`host 执行`) → `verify`，即完整执行纪律闭环。
