# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Pending
- Consider adding a `timeoutMs` override to `monitor`/`verify` (currently fixed at 5s).
- Consider a bundled `.claude/agents/waom-operator` subagent + `.claude/skills/` doc so a Claude Code host can drive the 4-tool loop in one shot.

## [0.1.1] - 2026-08-28

### Changed
- Version is now read from `package.json` at runtime instead of a hard-coded constant, so a release never has to update two places.

### Fixed
- 0.1.0 was published via a one-time manual token (required for the "package must already exist before OIDC" bootstrap). 0.1.1 re-publishes through the npm **OIDC trusted publisher** so the package carries `GitHub Actions published` sigstore provenance and future releases are fully automated.

## [0.1.0] - 2026-08-28

### Added
- Initial MCP server exposing the Ironbound WAOM loop as four tools: `monitor`, `decide`, `fix`, `verify`.
- Ports the pure `probe` / `heuristicDecide` / `evaluate` / `buildFixPrompt` logic from `@shizhanyu13/dsh-waom`; the host agent (Claude Code / Codex / Cursor) is the executor.
- stdio transport via `npx @shizhanyu13/waom-mcp`; 0 DSH runtime deps.
- OIDC trusted-publishing workflow with test + build + version/CHANGELOG gates.
