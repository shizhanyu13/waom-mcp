# Release SOP

`@shizhanyu13/waom-mcp` is a **fully buildable** npm package (unlike the
`dsh-*` release carriers, which are incomplete monorepo snapshots). It needs no
vendored source; `tsc` produces `lib/` from `src/`, and `lib/` is **not**
committed to git.

## Local verification (before you tag)

```sh
npm install --legacy-peer-deps   # MCP SDK + zod
npm run typecheck                # tsc --noEmit
npm test                         # vitest run (8 unit tests)
npm run build                    # tsc -> lib/
```

## Release checklist (right after a change lands)

1. **Change** in `src/` (usually a ported change from `@shizhanyu13/dsh-waom`).
2. `npm test` + `npm run typecheck` + `npm run build` — all green.
3. Bump `version` in `package.json`.
4. Add a matching `## [x.y.z] - YYYY-MM-DD` entry to `CHANGELOG.md` (Keep a Changelog).
5. Commit + push.
6. Tag `v{x.y.z}` and push the tag.
7. The `publish.yml` workflow runs `test` → `build` → version gate → idempotent `npm publish --access public` (OIDC, no token needed).
8. Verify on the registry: `npm view @shizhanyu13/waom-mcp@x.y.z`.

> **Idempotency:** the publish step skips a version that already exists on npm,
> so re-tagging after a release won't fail with E403.

## Keeping in sync with `dsh-waom`

The pure logic (`probe`/`heuristicDecide`/`evaluate`/`buildFixPrompt`) lives in
both `@shizhanyu13/dsh-waom` and `@shizhanyu13/waom-mcp`. When you change it in
DSH, port the same change to `src/waom.ts` and re-release this package.
