# tarelka.xyz

Simple page showing a 3D model using Three.js.

## Table of Contents

- [Project Structure](#project-structure)
  - [Directory Structure](#directory-structure)
  - [Module Descriptions](#module-descriptions)
- [Attributions](#attributions)

## Project Structure

This project is organized into modular ES6 modules for better maintainability and code organization.

### Directory Structure

```
tarelka/
├── src/
│   ├── main.js         # Main entry point and animation loop
│   ├── config.js       # Application configuration
│   ├── scene.js        # Scene setup and lighting
│   ├── renderer.js     # WebGL renderer configuration
│   ├── loader.js       # Model loading with retry logic
│   ├── controls.js     # Mouse and touch interaction
│   ├── snow.js         # Snow effect with parallax layers
│   ├── rain.js         # Rain effect with skewed pixelated streaks
│   ├── wind.js         # Wind effect with drifting parallax streaks
│   ├── sleet.js        # Sleet effect (rain/snow mix)
│   ├── fog.js          # Fog effect (drifting CSS overlay)
│   ├── thunderstorm.js # Thunderstorm effect (rain + lightning flashes)
│   ├── momentary-event.js # Random-interval event scheduler + decaying pulses
│   ├── weather.js      # Coordinates mutually-exclusive weather effects
│   ├── weather-registry.js # List of weather effects, names, and shortcut keys
│   ├── weather-effect.js # Shared persisted toggle lifecycle for all weather effects
│   ├── canvas-effect.js # Shared canvas overlay lifecycle for particle effects
│   ├── live-weather.js # Live Stavanger weather fetch + effect auto-selection
│   └── utils.js        # Utility functions
├── assets/
│   ├── models/         # 3D models
│   └── icons/          # Favicons and icons
├── index.html          # Main HTML file
├── style.css           # Stylesheet
└── README.md           # This file
```

### Module Descriptions

- **`src/main.js`** - Main entry point, animation loop, WebGL support check, cleanup
- **`src/config.js`** - Configuration for PS1 style, camera, lighting, interactions, backgrounds
- **`src/scene.js`** - Scene creation, background gradient, lighting setup, camera initialization
- **`src/renderer.js`** - WebGL renderer configuration, context handlers, resize handling
- **`src/loader.js`** - Model loading with retry logic, progress tracking, error handling
- **`src/controls.js`** - Mouse and touch events, rotation with inertia, drag-to-rotate
- **`src/snow.js`** - Animated snow effect with 3 parallax layers for depth
- **`src/rain.js`** - Animated rain effect with short, skewed, pixelated streaks
- **`src/wind.js`** - Animated wind effect with faint, near-horizontal drifting streaks
- **`src/sleet.js`** - Animated sleet effect combining rain's fall angle with snow's horizontal drift
- **`src/fog.js`** - Fog effect: a single DOM layer whose gradients, fade, and drift are pure CSS
- **`src/thunderstorm.js`** - Thunderstorm effect: rain streaks plus photosensitivity-safe lightning flashes
- **`src/momentary-event.js`** - Random-interval event scheduler and exponentially-decaying pulse intensity
- **`src/weather.js`** - Instantiates weather effects (with a no-op fallback on failure) and keeps them mutually exclusive
- **`src/weather-registry.js`** - The single list of weather effects: name, label, keyboard key, and factory
- **`src/weather-effect.js`** - Shared persisted enabled/toggle/`setEnabled` lifecycle used by every weather effect
- **`src/canvas-effect.js`** - Shared canvas create/resize/clear/cleanup lifecycle used by particle effects
- **`src/live-weather.js`** - Fetches current Stavanger weather (Open-Meteo) and auto-selects the matching effect
- **`src/utils.js`** - WebGL support check, debounce function, material disposal

## Features

- **Interactive 3D Model** - Drag to rotate, inertia-based movement
- **PS1 Graphics Mode** - Retro PlayStation 1 style rendering (press **P** to toggle)
- **Snow Effect** - Falling snowflakes with parallax layers (press **S** to toggle)
- **Rain Effect** - Falling rain at a skewed angle (press **R** to toggle)
- **Wind Effect** - Faint drifting streaks with parallax layers (press **W** to toggle)
- **Sleet Effect** - Falling rain/snow mix with horizontal drift (press **L** to toggle)
- **Fog Effect** - Slowly drifting translucent fog overlay (press **F** to toggle)
- **Thunderstorm Effect** - Rain with occasional lightning flashes (press **T** to toggle)
- **Live Weather** - Auto-selects the matching effect from Stavanger's current conditions on load, unless you've made an explicit choice
- **Touch Support** - Full mobile and tablet support
- **Responsive Design** - Adapts to any screen size
- **WebGL Optimization** - Pauses rendering when tab is inactive

Snow, rain, wind, sleet, fog, and thunderstorm are mutually exclusive — enabling one turns off the others.

Lightning flashes are kept below the WCAG 2.3.1 limit of three flashes per second. With
`prefers-reduced-motion: reduce`, each strike becomes a single dim flash and the fog stops drifting.

## Keyboard Controls

- **P** - Toggle PS1 graphics style (requires page reload)
- **S** - Toggle snow effect on/off (disables the others if active)
- **R** - Toggle rain effect on/off (disables the others if active)
- **W** - Toggle wind effect on/off (disables the others if active)
- **L** - Toggle sleet effect on/off (disables the others if active)
- **F** - Toggle fog effect on/off (disables the others if active)
- **T** - Toggle thunderstorm effect on/off (disables the others if active)
- **D** - Toggle debug mode (shows renderer statistics in console)

Shortcuts are ignored while Ctrl, Cmd, or Alt is held, so browser shortcuts like Ctrl+F or Cmd+R keep working normally.

## Development

```bash
npm ci --ignore-scripts
npm test
```

The browser loads three.js from jsdelivr via the import map in `index.html`; there is no build
step. three.js is *also* an exact-pinned devDependency so the test suite can exercise real
three.js behaviour instead of a mock. Those two versions must match — `tests/importmap.test.js`
fails if they drift, so bump both together (and refresh the SRI hashes in the import map).

## Hosting

This site is hosted via [Cloudflare Pages](https://pages.cloudflare.com/), providing fast global delivery through Cloudflare's edge network.

### Caching

There's no build step and no content-hashed filenames, so `_headers` forces `/src/*`
and `/style.css` to revalidate on every request.
`max-age=14400` lets a browser or edge PoP keep serving one file's pre-deploy copy
for up to 4 hours after a related file has already updated — e.g. an old cached
`renderer.js` paired with a freshly deployed `style.css` once caused PS1 mode to
render into a shrunken viewport. `index.html` doesn't need the same treatment;
Cloudflare Pages already serves it `max-age=0, must-revalidate` by default.

### Content Security Policy

The page ships a strict CSP with no `'unsafe-inline'`; the single inline script (the
import map) is allowed by hash. If that block is edited, regenerate the hash:

```bash
python3 -c "import re,hashlib,base64;h=open('index.html').read();b=re.search(r'<script type=\"importmap\">(.*?)</script>',h,re.S).group(1);print('sha256-'+base64.b64encode(hashlib.sha256(b.encode()).digest()).decode())"
```

Cloudflare's **Bot Fight Mode** injects an inline bot-detection script into every
HTML response. The CSP blocks it, which logs a `script-src-elem` violation in the
browser console. The injected script embeds a per-request ray ID and timestamp, so
its hash changes on every load and cannot be allowlisted — and a static site has no
way to issue a nonce. The block is harmless (only Cloudflare's bot detection fails
to run), so either leave it or turn Bot Fight Mode off under **Security → Bots** in
the Cloudflare dashboard. Do not relax the CSP to accommodate it.

## Attributions

Models used:

- [Plate](https://poly.pizza/m/rTXpwR22g1) by [Kay Lousberg](https://poly.pizza/u/Kay%20Lousberg)
- [Block Alphabet](https://poly.pizza/m/x4Ia0hqh7t) by [Jose Rosero](https://poly.pizza/u/Jose%20Rosero)
