/**
 * Fog effect — a full-screen translucent overlay that slowly drifts
 *
 * Unlike the particle effects, fog has no per-frame work in JS: it's a single
 * DOM layer whose look, fade, and drift live entirely in style.css (see
 * `.fog-layer`). The drift animates only `transform`, so the browser can
 * composite it without repainting the gradients every frame. This class just
 * owns the element and mirrors the enabled state onto a CSS class.
 */
import { CONFIG } from './config.js';
import { WeatherEffect } from './weather-effect.js';

export class FogEffect extends WeatherEffect {
    constructor() {
        super({
            storageKey: 'fogEnabled',
            // No seasonal default (like rain) — fog has no natural "season" signal
            resolveDefaultEnabled: () => false
        });

        this.element = document.createElement('div');
        this.element.classList.add('weather-layer', 'fog-layer');
        this.element.setAttribute('aria-hidden', 'true');
        if (CONFIG.ps1Style) {
            this.element.classList.add('weather-layer--ps1');
        }
        document.querySelector('main').appendChild(this.element);

        this._onEnabledChange(this.enabled);
    }

    _onEnabledChange(enabled) {
        this.element.classList.toggle('fog-layer--visible', enabled);
    }

    cleanup() {
        this.element.remove();
    }
}
