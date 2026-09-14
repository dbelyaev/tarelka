/**
 * Shared lifecycle for a full-viewport, toggleable 2D canvas overlay effect
 * (snow, rain, ...). Subclasses own everything that differs between effects —
 * the particle model, count-adjustment algorithm, update(), and draw() — and
 * implement _syncParticles(canvasWidth, canvasHeight) to keep existing
 * particles in sync with a resized canvas and adjust the particle count.
 */
import { CONFIG } from './config.js';
import { debounce } from './utils.js';

export class CanvasEffect {
    constructor({ className, ps1ClassName, storageKey, resolveDefaultEnabled }) {
        this.canvas = document.createElement('canvas');
        this.ctx = this.canvas.getContext('2d');

        this._storageKey = storageKey;
        const stored = localStorage.getItem(storageKey);
        this.hasExplicitPreference = stored !== null;
        this.enabled = stored === null ? resolveDefaultEnabled() : stored === 'true';

        this.canvas.className = className;
        this.canvas.setAttribute('aria-hidden', 'true');
        if (CONFIG.ps1Style) {
            this.canvas.classList.add(ps1ClassName);
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

    toggle() {
        this.enabled = !this.enabled;
        this.hasExplicitPreference = true;
        localStorage.setItem(this._storageKey, String(this.enabled));
        if (!this.enabled) {
            this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        }
    }

    /**
     * Set enabled state programmatically (e.g. live-weather auto-selection)
     * WITHOUT recording it as a user preference: unlike toggle(), this does
     * not touch hasExplicitPreference or localStorage. An automated decision
     * must stay re-adjustable on every future call — persisting it would make
     * the constructor's `hasExplicitPreference = stored !== null` check treat
     * it as a real user choice on the next page load, permanently blocking
     * further automated changes.
     */
    setEnabled(enabled) {
        if (this.enabled === enabled) return;
        this.enabled = enabled;
        if (!this.enabled) {
            this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        }
    }

    cleanup() {
        this.resizeHandler.cancel();
        window.removeEventListener('resize', this.resizeHandler);
        this.canvas.remove();
    }
}
