# Copilot Instructions for tarelka.xyz

A static, build-free 3D model viewer (Three.js) with a PS1 retro rendering mode and
mutually-exclusive weather effects. No bundler, no framework — plain ES modules loaded directly by the browser.

## Commands

```bash
npm ci --ignore-scripts   # install (this repo has no install-time scripts)
npm test                  # runs `vitest run` (full suite)
```

- Run a single test file: `npx vitest run tests/config.test.js`
- Run tests matching a name: `npx vitest run -t "some test name"`
- Tests use jsdom by default (`vitest.config.js`); files that need to read real files off disk
  (e.g. `tests/importmap.test.js`) opt into `// @vitest-environment node` at the top of the file.
- There are no build or lint scripts in `package.json` — `npm test` is the only script defined.

## Architecture

- No build step. The browser loads `three` straight from jsdelivr via the `<script type="importmap">`
  in `index.html`; `src/main.js` and friends are loaded as native ES modules.
- `three` is *also* an exact-pinned devDependency purely so the test suite can exercise real
  three.js behavior instead of a mock — it is never bundled or shipped.
- **The CDN-loaded version (import map in `index.html`) and the npm devDependency version
  (`package.json`) must always match exactly.** There is no build to fail — `tests/importmap.test.js`
  is the only enforcement, and it fails `npm test` on drift. When bumping three.js, update both
  together and regenerate the SRI hashes (`sha384-...`) in the import map for every mapped CDN URL.
- Module responsibilities (`src/`):
  - `main.js` — entry point, animation loop, WebGL support check, cleanup
  - `config.js` — shared application settings (`CONFIG` object): PS1 style, camera, lighting, rotation
  - `scene.js` — scene/background/camera/lighting construction
  - `renderer.js` — WebGL renderer setup, context-loss handlers, resize handling
  - `loader.js` — model loading with retry logic and progress tracking
  - `controls.js` — mouse/touch drag-to-rotate with inertia
  - `snow.js` — parallax snowflake effect (3 layers); also owns its own tuning constants
    (`LAYER_DISTRIBUTION`, `SMALL_FLAKE_THRESHOLD`, `MIN_SNOWFLAKES`) outside of `CONFIG`
  - `rain.js`, `wind.js`, `sleet.js` — canvas particle effects built on `canvas-effect.js`
  - `fog.js` — non-canvas fog overlay; its look and drift live in `style.css` (`.fog-layer`)
  - `thunderstorm.js` — extends `RainEffect` with lightning flashes driven by `momentary-event.js`;
    flash timing/opacity bounds in `CONFIG.thunderstorm` are photosensitivity limits (WCAG 2.3.1), not just tuning
  - `weather-effect.js` — base class owning the persisted `enabled` / `toggle()` / `setEnabled()` /
    `hasExplicitPreference` contract; `canvas-effect.js` extends it for canvas overlays
  - `weather-registry.js` — the single list of weather effects (name, label, key, factory). Add new
    effects here; names must match `VALID_EFFECTS` in `live-weather.js` (enforced by `tests/weather-registry.test.js`)
  - `weather.js` — instantiates the registry with a no-op fallback and keeps effects mutually exclusive
  - `live-weather.js` — maps Stavanger's current WMO weather code to an effect name
  - `utils.js` — WebGL capability check, debounce, media-query helpers, material disposal
- Feature toggles are keyboard-driven: `P` = PS1 style and the weather keys (`S` snow, `R` rain, `W` wind,
  `L` sleet, `F` fog, `T` thunderstorm) persist their state to `localStorage` (`P` requires a reload to
  take effect); `D` = debug/renderer stats only flips `CONFIG.debug` in memory and resets on reload —
  it is not persisted. Shortcuts with Ctrl/Cmd/Alt held or auto-repeat keydowns are ignored.
- `index.html` ships a strict CSP (no `'unsafe-inline'`). The only inline script is the import map,
  allowed via a sha256 hash in the CSP meta tag — regenerate that hash whenever the import map JSON
  changes:
  ```bash
  python3 -c "import re,hashlib,base64;h=open('index.html').read();b=re.search(r'<script type=\"importmap\">(.*?)</script>',h,re.S).group(1);print('sha256-'+base64.b64encode(hashlib.sha256(b.encode()).digest()).decode())"
  ```
  Do not add `'unsafe-inline'` to work around CSP issues (e.g. Cloudflare Bot Fight Mode's
  injected script) — that's a known, harmless console warning; leave the CSP strict.

## Deployment / caching notes

- Hosted on Cloudflare Pages with no build step and no content-hashed filenames. `_headers` sets
  `Cache-Control: no-cache` for `/src/*` and `/style.css`, forcing revalidation on every request so
  app code and styles can never drift apart after a deploy (Cloudflare's default `max-age=14400`
  previously let a stale cached file pair with a freshly deployed one for up to 4 hours, which once
  broke PS1 mode's viewport sizing). Keep this override in mind when changing cross-file contracts
  (e.g. CSS classes referenced from JS).

## Conventions

- Commit messages follow Conventional Commits — see `.github/git-commit-instructions.md` for the
  full type list, scope rules, 72-char subject limit, and footer format (`BREAKING CHANGE:`, `REF #<n>`).
- CI (`.github/workflows/test.yml`) runs `npm ci --ignore-scripts` then `npm test` on Node 22 for
  every PR and push to `main`. `.github/workflows/zizmor.yml` lints GitHub Actions workflows for
  security issues on the same triggers.
