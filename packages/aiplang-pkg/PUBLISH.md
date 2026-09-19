# Publishing aiplang@2.16.0 to npm

## Checklist

- [x] Version aligned: npm currently has 2.11.13, source evolved to 2.16.0 with interactive layer fixes
- [x] package.json audited: all fields correct (name, version, bin, main, exports, files, engines.node >=20, license, repository)
- [x] Build clean: aip-render.js regenerated from front/src/lib/aip-render.ts, tarball generated without errors
- [x] Smoke test: bin (aiplang --version, --help) verified; npm pack successful

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

**Files changed:**
- `packages/aiplang-pkg/package.json` — added explicit `exports` field
- `packages/aiplang-pkg/lib/aip-render.js` — regenerated from TypeScript source
- `.gitignore` — added *.tgz to ignore build artifacts

## Post-publish steps

1. **Tag the release** in the codigo-fonte repo:
   ```bash
   git tag -a v2.16.0 -m "Release aiplang@2.16.0 to npm"
   git push origin v2.16.0
   ```

2. **Announce in relevant channels** (if needed)

3. **Update front/docs** if there are breaking changes (there aren't in 2.16.0)

---

**Generated**: 2026-09-19  
**Package**: aiplang@2.16.0  
**Tarball**: aiplang-2.16.0.tgz (125.8 kB)  
**Shasum**: 8dd740a6f8396c7eb1ddc81f049e74ab0c5dc6a1
