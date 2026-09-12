/**
 * Rain effect — short, pixelated streaks falling at a skewed angle
 *
 * Each drop wobbles a few degrees around one shared base angle rolled once
 * per instance, so the effect still reads as coherent wind-driven rain (not
 * scattered confetti) while individual streaks aren't perfectly parallel.
 * There are no parallax layers: a streak's length + skew already reads as
 * directional motion/depth on its own, so the extra layering complexity
 * snow needs for its drifting circles isn't needed here.
 *
 * Performance: opacity is quantized to 0.1 increments so drops share
 * strokeStyle values and can be batched — one stroke() call per opacity
 * group, mirroring snow's one-fill()-per-group approach.
 */
import { CONFIG } from './config.js';
import { debounce, prefersCoarsePointer } from './utils.js';

/** Minimum raindrop count so the effect stays visible on very small viewports */
const MIN_RAINDROPS = 10;

/**
 * Raindrop — a short line segment falling along its own direction vector
 */
class Raindrop {
    constructor(canvasWidth, canvasHeight, baseAngleDeg) {
        this.baseAngleDeg = baseAngleDeg;
        this.reset(canvasWidth, canvasHeight, true);
    }

    reset(canvasWidth, canvasHeight, initial = false) {
        this.x = Math.random() * canvasWidth;
        this.length = CONFIG.rain.length.min + Math.random() * (CONFIG.rain.length.max - CONFIG.rain.length.min);
        this.y = initial ? Math.random() * canvasHeight : -this.length;
        this.speed = CONFIG.rain.speed.min + Math.random() * (CONFIG.rain.speed.max - CONFIG.rain.speed.min);
        this.opacity = Math.round((CONFIG.rain.opacity.min + Math.random() * (CONFIG.rain.opacity.max - CONFIG.rain.opacity.min)) * 10) / 10;
        this.strokeStyle = `rgba(200, 215, 235, ${this.opacity})`;
        this.canvasWidth = canvasWidth;
        this.canvasHeight = canvasHeight;

        // Wobble a few degrees around the shared base angle so drops aren't perfectly parallel
        const jitterDeg = (Math.random() - 0.5) * 2 * CONFIG.rain.angleJitter;
        const rad = (this.baseAngleDeg + jitterDeg) * Math.PI / 180;
        this.dirX = Math.sin(rad);
        this.dirY = Math.cos(rad);
    }

    update(delta) {
        this.x += this.dirX * this.speed * delta * 60;
        this.y += this.dirY * this.speed * delta * 60;

        // Reset if out of bounds (length is the margin, since a diagonal
        // streak needs more slack than a point before it visibly pops)
        if (this.y - this.length > this.canvasHeight) {
            this.reset(this.canvasWidth, this.canvasHeight, false);
        }

        // Wrap horizontally
        if (this.x > this.canvasWidth + this.length) {
            this.x = -this.length;
        } else if (this.x < -this.length) {
            this.x = this.canvasWidth + this.length;
        }
    }
}

/**
 * Rain effect manager
 */
export class RainEffect {
    constructor() {
        this.canvas = document.createElement('canvas');
        this.ctx = this.canvas.getContext('2d');
        this.raindrops = [];

        // No seasonal default (unlike snow) — rain has no natural "season" signal, so it
        // simply respects the persisted preference and otherwise starts disabled.
        const stored = localStorage.getItem('rainEnabled');
        this.hasExplicitPreference = stored !== null;
        this.enabled = stored === 'true';

        // Style canvas
        this.canvas.className = 'rain-canvas';
        this.canvas.setAttribute('aria-hidden', 'true');

        if (CONFIG.ps1Style) {
            this.canvas.classList.add('rain-canvas--ps1');
        }

        document.querySelector('main').appendChild(this.canvas);

        // One base skew angle for the whole instance ("wind direction"); each
        // drop then wobbles a few degrees around it — see Raindrop.reset().
        const angleDeg = CONFIG.rain.angle.min + Math.random() * (CONFIG.rain.angle.max - CONFIG.rain.angle.min);
        this.angleDeg = angleDeg * (Math.random() < 0.5 ? 1 : -1);

        this.resize();

        // Handle window resize (debounced to match renderer resize behavior)
        this.resizeHandler = debounce(() => this.resize(), CONFIG.resize.debounceMs);
        window.addEventListener('resize', this.resizeHandler);
    }

    resize() {
        const scale = CONFIG.ps1Style ? 1 / CONFIG.ps1PixelScale : 1;
        this.canvas.width = Math.max(1, Math.floor(window.innerWidth * scale));
        this.canvas.height = Math.max(1, Math.floor(window.innerHeight * scale));
        this.canvas.style.width = `${window.innerWidth}px`;
        this.canvas.style.height = `${window.innerHeight}px`;

        const w = this.canvas.width;
        const h = this.canvas.height;

        // Update existing raindrops with new dimensions
        this.raindrops.forEach(drop => {
            drop.canvasWidth = w;
            drop.canvasHeight = h;
        });

        this._adjustDropCount(w, h);
    }

    /**
     * Adjust raindrop count to match the target for the current viewport.
     * Density is scaled down on coarse-pointer (mobile-class) devices to keep
     * per-frame draw cost low on weaker hardware.
     */
    _adjustDropCount(canvasWidth, canvasHeight) {
        const densityScale = prefersCoarsePointer() ? CONFIG.performance.mobileParticleScale : 1;
        const targetTotal = Math.max(
            Math.floor((canvasWidth * canvasHeight * densityScale) / CONFIG.rain.dropsPerArea),
            MIN_RAINDROPS
        );
        const currentTotal = this.raindrops.length;

        if (targetTotal > currentTotal) {
            const toAdd = targetTotal - currentTotal;
            for (let i = 0; i < toAdd; i++) {
                this.raindrops.push(new Raindrop(canvasWidth, canvasHeight, this.angleDeg));
            }
        } else if (targetTotal < currentTotal) {
            this.raindrops.length = targetTotal;
        }
    }

    update(delta) {
        if (!this.enabled) return;

        this.raindrops.forEach(drop => drop.update(delta));
    }

    /**
     * Draw all raindrops, batched by strokeStyle (quantized opacity) to minimize
     * canvas state changes — one stroke() call per opacity group.
     */
    draw() {
        if (!this.enabled) return;

        const ctx = this.ctx;
        ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        const groups = new Map();
        for (const drop of this.raindrops) {
            let path = groups.get(drop.strokeStyle);
            if (!path) {
                path = new Path2D();
                groups.set(drop.strokeStyle, path);
            }
            path.moveTo(drop.x, drop.y);
            path.lineTo(drop.x + drop.dirX * drop.length, drop.y + drop.dirY * drop.length);
        }

        ctx.lineWidth = CONFIG.rain.lineWidth;
        ctx.lineCap = 'butt'; // square, blocky ends — keeps the pixelated look instead of soft rounded tips
        for (const [style, path] of groups) {
            ctx.strokeStyle = style;
            ctx.stroke(path);
        }
    }

    toggle() {
        this.enabled = !this.enabled;
        this.hasExplicitPreference = true;
        localStorage.setItem('rainEnabled', String(this.enabled));
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
