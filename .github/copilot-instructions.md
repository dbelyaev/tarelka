# Copilot Instructions for tarelka.xyz

A static, build-free 3D model viewer (Three.js) with a PS1 retro rendering mode and a snow
effect. No bundler, no framework — plain ES modules loaded directly by the browser.

## Commands

```bash
npm ci --ignore-scripts   # install (this repo has no install-time scripts)
npm test                  # runs `vitest run` (full suite)
```

- Run a single test file: `npx vitest run tests/config.test.js`
- Run tests matching a name: `npx vitest run -t "some test name"`
- Tests use jsdom by default (`vitest.config.js`); files that need to read real files off disk
  (e.g. `tests/importmap.test.js`) opt into `// @vitest-environment node` at the top of the file.

## Architecture

- No build step. The browser loads `three` straight from jsdelivr via the `<script type="importmap">`
  in `index.html`; `src/main.js` and friends are loaded as native ES modules.
- `three` is *also* an exact-pinned devDependency purely so the test suite can exercise real
  three.js behavior instead of a mock — it is never bundled or shipped.
- **The CDN-loaded version (import map in `index.html`) and the npm devDependency version
  (`package.json`) must always match exactly.** `tests/importmap.test.js` enforces this and fails
  the build on drift. When bumping three.js, update both together and regenerate the SRI hashes
  (`sha384-...`) in the import map for every mapped CDN URL.
- Module responsibilities (`src/`):
  - `main.js` — entry point, animation loop, WebGL support check, cleanup
  - `config.js` — all tunable constants (`CONFIG` object): PS1 style, camera, lighting, rotation, snow
  - `scene.js` — scene/background/camera/lighting construction
  - `renderer.js` — WebGL renderer setup, context-loss handlers, resize handling
  - `loader.js` — model loading with retry logic and progress tracking
  - `controls.js` — mouse/touch drag-to-rotate with inertia
  - `snow.js` — parallax snowflake effect (3 layers)
  - `utils.js` — WebGL capability check, debounce, material disposal
- Feature toggles are keyboard-driven and persisted in `localStorage`: `P` = PS1 style (needs
  reload), `S` = snow effect, `D` = debug/renderer stats in console.
- `index.html` ships a strict CSP (no `'unsafe-inline'`). The only inline script is the import map,
  allowed via a sha256 hash in the CSP meta tag — regenerate that hash whenever the import map JSON
  changes:
  ```bash
  python3 -c "import re,hashlib,base64;h=open('index.html').read();b=re.search(r'<script type=\"importmap\">(.*?)</script>',h,re.S).group(1);print('sha256-'+base64.b64encode(hashlib.sha256(b.encode()).digest()).decode())"
  ```
  Do not add `'unsafe-inline'` to work around CSP issues (e.g. Cloudflare Bot Fight Mode's
  injected script) — that's a known, harmless console warning; leave the CSP strict.

## Deployment / caching notes

- Hosted on Cloudflare Pages with no build step and no content-hashed filenames. `_headers` forces
  `/src/*` and `/style.css` to revalidate on every request, but still allows `max-age=14400` — a
  stale cached file can be paired with a freshly deployed one for up to 4 hours across an edge PoP.
  Keep this in mind when changing cross-file contracts (e.g. CSS classes referenced from JS).

## Conventions

- Commit messages follow Conventional Commits — see `.github/git-commit-instructions.md` for the
  full type list, scope rules, 72-char subject limit, and footer format (`BREAKING CHANGE:`, `REF #<n>`).
- CI (`.github/workflows/test.yml`) runs `npm ci --ignore-scripts` then `npm test` on Node 22 for
  every PR and push to `main`. `.github/workflows/zizmor.yml` lints GitHub Actions workflows for
  security issues on the same triggers.
