/**
 * Shared lifecycle for a full-viewport 2D canvas overlay effect (snow, rain, ...).
 * Subclasses own everything that differs between effects — the particle model,
 * count-adjustment algorithm, update(), and draw() — and implement
 * _syncParticles(canvasWidth, canvasHeight) to keep existing particles in sync
 * with a resized canvas and adjust the particle count.
 */
import { CONFIG } from './config.js';
import { debounce } from './utils.js';
import { WeatherEffect } from './weather-effect.js';

export class CanvasEffect extends WeatherEffect {
    constructor({ className, storageKey, resolveDefaultEnabled }) {
        super({ storageKey, resolveDefaultEnabled });

        this.canvas = document.createElement('canvas');
        this.ctx = this.canvas.getContext('2d');

        this.canvas.classList.add('weather-layer', className);
        this.canvas.setAttribute('aria-hidden', 'true');
        if (CONFIG.ps1Style) {
            // PS1 mode: draw at a fraction of viewport resolution and let the CSS
            // upscale with nearest-neighbor filtering, matching the WebGL renderer's
            // pixelation (see renderer.js computeRenderSize).
            this.canvas.classList.add('weather-layer--ps1');
        }

        document.querySelector('main').appendChild(this.canvas);
    }

    resize() {
        const scale = CONFIG.ps1Style ? 1 / CONFIG.ps1PixelScale : 1;
        this.canvas.width = Math.max(1, Math.floor(window.innerWidth * scale));
        this.canvas.height = Math.max(1, Math.floor(window.innerHeight * scale));
        this.canvas.style.width = `${window.innerWidth}px`;
        this.canvas.style.height = `${window.innerHeight}px`;

        this._syncParticles(this.canvas.width, this.canvas.height);
    }

    _startResizeListener() {
        this.resizeHandler = debounce(() => this.resize(), CONFIG.resize.debounceMs);
        window.addEventListener('resize', this.resizeHandler);
    }

    _onEnabledChange(enabled) {
        if (!enabled) {
            this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        }
    }

    cleanup() {
        this.resizeHandler.cancel();
        window.removeEventListener('resize', this.resizeHandler);
        this.canvas.remove();
    }
}
