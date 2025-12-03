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
- **`src/utils.js`** - WebGL support check, debounce function, material disposal

## Features

- **Interactive 3D Model** - Drag to rotate, inertia-based movement
- **PS1 Graphics Mode** - Retro PlayStation 1 style rendering (press **P** to toggle)
- **Snow Effect** - Falling snowflakes with parallax layers (press **S** to toggle)
- **Touch Support** - Full mobile and tablet support
- **Responsive Design** - Adapts to any screen size
- **WebGL Optimization** - Pauses rendering when tab is inactive

## Keyboard Controls

- **P** - Toggle PS1 graphics style (requires page reload)
- **S** - Toggle snow effect on/off

# Attributions

Models used:

- [Plate](https://poly.pizza/m/rTXpwR22g1) by [Kay Lousberg](https://poly.pizza/u/Kay%20Lousberg)
- [Block Alphabet](https://poly.pizza/m/x4Ia0hqh7t) by [Jose Rosero](https://poly.pizza/u/Jose%20Rosero)
