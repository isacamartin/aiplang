# Publishing aiplang@2.16.0 to npm

## Pre-publish Checklist (for isac approval)

### Ready ✅
- [x] Version bump: 2.11.13 → 2.16.0 (5 minor versions, ready to publish)
- [x] package.json complete: name, version, type (commonjs), description, keywords, author, license (MIT), repository, homepage, bugs, bin, main, exports, files, engines (node>=20), publishConfig (access: public), dependencies
- [x] README.md present with quickstart: `npm install -g aiplang` + 5-min example + commands + features documented
- [x] LICENSE present: MIT with Copyright 2024-2026 isacamartin (correct title and dates)
- [x] aiplang-knowledge.md present: complete LLM reference for language syntax
- [x] Build artifacts: aip-render.js transpiled from TypeScript, regenerated cleanly
- [x] npm pack: tarball generated (aiplang-2.16.0.tgz, 126.6 KB, 9 files, 469.8 KB unpacked)
- [x] Tarball content verified: package.json, README.md, LICENSE, aiplang-knowledge.md, bin/aiplang.js, lib/aip-render.js, runtime/aiplang-runtime.js, runtime/aiplang-hydrate.js, server/server.js
- [x] .npmignore configured correctly: excludes node_modules, .env, *.db, *.tgz, tests, .github
- [x] No build artifacts in tarball: clean, ready for install

### Waiting for isac decision ⚠️
- [ ] **npm registry**: Package name `aiplang` available/occupied? Currently published at v2.11.13 on npm registry (verified 2026-09-26). Upgrade to v2.16.0 approved?
- [ ] **Dependencies**: `uWebSockets.js` from GitHub (github:uNetworking/uWebSockets.js#v20.44.0) and `better-sqlite3` (native, needs compilation). Installation may fail in build-tools-free environments. Acceptable trade-off?
- [ ] **2FA**: npm account (`isacamartin`) has 2FA enabled? If yes, have authenticator app ready during `npm login` and `npm publish`
- [ ] **CI/CD**: Is there an automated release pipeline, or is this a manual publish? (affects post-publish tagging workflow)
- [ ] **Publicity**: Should the release be announced after publish? (e.g., GitHub releases, npm trending, social)

## Version History

| Version | Status | Notes |
|---------|--------|-------|
| 2.11.13 | Published on npm | Last published version |
| 2.12.0  | In source | SSR interativo, correções de segurança |
| 2.13.0  | In source | Forms from model, auto migration |
| 2.14.0  | In source | Owner-scoping, inline table edit |
| 2.15.0  | In source | Unified auth contract |
| 2.16.0  | Ready to publish | Interactive layer fixes, renderer parity |

## Steps to Publish (for @isacamartin)

1. **Login to npm** (use your npm account):
   ```bash
   npm login
   ```
   - Username: isacamartin
   - Password: (your npm password)
   - Email: isacamartin@gmail.com
   - If prompted for 2FA/OTP, provide your authenticator app code

2. **Navigate to package directory**:
   ```bash
   cd codigo-fonte/packages/aiplang-pkg
   ```

3. **Publish with public access**:
   ```bash
   npm publish --access public
   ```

4. **Verify publication** (run in a clean directory):
   ```bash
   npm view aiplang version
   # Should output: 2.16.0

   npm view aiplang
   # Should show all metadata

   npm view aiplang dist.tarball
   # Should show the tarball URL
   ```

5. **Test installation in a clean project**:
   ```bash
   mkdir /tmp/test-aiplang && cd /tmp/test-aiplang
   npm init -y
   npm install aiplang@2.16.0
   npx aiplang --version
   # Should output: aiplang v2.16.0
   ```

## Troubleshooting

### npm login fails
- Ensure you're on a machine with npm CLI configured
- Check that your npm password is correct (not your GitHub password)
- Verify your npm account has publish permissions for the `aiplang` package

### 2FA/OTP Required
- Have your authenticator app (Google Authenticator, Authy, etc.) ready
- When prompted, enter the current 6-digit code from your app
- The code expires after ~30 seconds, so be ready

### Publish rejected (version already exists)
- This would indicate the version was already published
- Check `npm view aiplang version` — if it shows 2.16.0, publication succeeded
- Do not republish; npm prevents duplicate versions

### Publish rejected (unauthorized)
- Confirm you have publish permissions for the `aiplang` package
- You should be the owner or a team member with publish access
- If not, the package owner needs to add you

## Changes in this version

### 2.16.0 — Interactive Layer Fixes

**Major fixes:**
- Renderer parity: aip-render.js properly synchronized with front/src/lib/aip-render.ts
- Interactive layer reliability improvements
- Quality gate updates (gitleaks, lint, npm audit passing)

**Files changed in prep for 2.16.0 publish:**
- `packages/aiplang-pkg/package.json` — added `type: "commonjs"` (explicit module type), `publishConfig.access: "public"` (npm public registry), `LICENSE` to `files` array
- `packages/aiplang-pkg/lib/aip-render.js` — regenerated from TypeScript source (front/src/lib/aip-render.ts) for renderer parity
- `.npmignore` — added `*.tgz` to exclude build artifacts from tarball
- `README.md` — updated template list and quickstart

## Post-publish steps

1. **Tag the release** in the codigo-fonte repo:
   ```bash
   git tag -a v2.16.0 -m "Release aiplang@2.16.0 to npm"
   git push origin v2.16.0
   ```

2. **Announce in relevant channels** (if needed)

3. **Update front/docs** if there are breaking changes (there aren't in 2.16.0)

---

**Prepared**: 2026-09-26  
**Package**: aiplang@2.16.0  
**Tarball**: aiplang-2.16.0.tgz (126.6 kB, 9 files, 469.8 kB unpacked)  
**Node requirement**: >=20 (enforced in package.json engines)  
**Current npm version**: 2.11.13 (will be superseded by 2.16.0)  
**Git branch**: fix/render-parity-sync  
**Status**: Ready for `npm publish` (awaiting isac approval via checklist)
