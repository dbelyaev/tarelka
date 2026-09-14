/**
 * Sleet effect — short falling streaks with an independent horizontal drift
 *
 * Sleet reads as a rain/snow mix: each particle falls along a shared base
 * angle with per-particle jitter (rain's approach), but also carries a
 * small independent horizontal drift term applied every frame (snow's
 * approach) on top of its fall direction. That drift is what distinguishes
 * a Sleetflake from a Raindrop — without it, sleet would just be short,
 * steep rain. No parallax layers, same rationale as rain: the fall
 * direction plus drift already reads as directional motion on its own.
 *
 * Performance: opacity is quantized to 0.1 increments so particles share
 * strokeStyle values and can be batched — one stroke() call per opacity
 * group, mirroring rain's approach.
 */
import { CONFIG } from './config.js';
import { prefersCoarsePointer, randomInRange, randomSign } from './utils.js';
import { CanvasEffect } from './canvas-effect.js';

/** Minimum particle count so the effect stays visible on very small viewports */
const MIN_SLEET_PARTICLES = 10;

/**
 * Sleetflake — a short line segment falling along its own direction vector,
 * plus an independent horizontal drift wobble.
 */
class Sleetflake {
    constructor(canvasWidth, canvasHeight, baseAngleDeg) {
        this.baseAngleDeg = baseAngleDeg;
        this.reset(canvasWidth, canvasHeight, true);
    }

    reset(canvasWidth, canvasHeight, initial = false) {
        this.x = randomInRange(0, canvasWidth);
        this.length = randomInRange(CONFIG.sleet.length.min, CONFIG.sleet.length.max);
        this.y = initial ? randomInRange(0, canvasHeight) : -this.length;
        this.speed = randomInRange(CONFIG.sleet.speed.min, CONFIG.sleet.speed.max);
        this.drift = randomInRange(CONFIG.sleet.drift.min, CONFIG.sleet.drift.max);
        this.opacity = Math.round(randomInRange(CONFIG.sleet.opacity.min, CONFIG.sleet.opacity.max) * 10) / 10;
        this.strokeStyle = `rgba(220, 230, 240, ${this.opacity})`;
        this.canvasWidth = canvasWidth;
        this.canvasHeight = canvasHeight;

        const jitterDeg = randomInRange(-CONFIG.sleet.angleJitter, CONFIG.sleet.angleJitter);
        const rad = (this.baseAngleDeg + jitterDeg) * Math.PI / 180;
        this.dirX = Math.sin(rad);
        this.dirY = Math.cos(rad);
    }

    update(delta) {
        this.x += (this.dirX * this.speed + this.drift) * delta * 60;
        this.y += this.dirY * this.speed * delta * 60;

        if (this.y - this.length > this.canvasHeight) {
            this.reset(this.canvasWidth, this.canvasHeight, false);
        }

        if (this.x > this.canvasWidth + this.length) {
            this.x = -this.length;
        } else if (this.x < -this.length) {
            this.x = this.canvasWidth + this.length;
        }
    }
}

/**
 * Sleet effect manager
 */
export class SleetEffect extends CanvasEffect {
    constructor() {
        super({
            className: 'sleet-canvas',
            ps1ClassName: 'sleet-canvas--ps1',
            storageKey: 'sleetEnabled',
            // No seasonal default (like rain) — sleet has no natural "season" signal
            resolveDefaultEnabled: () => false
        });
        this.sleetflakes = [];

        // One base skew angle for the whole instance ("wind direction"); each
        // particle then wobbles a few degrees around it — see Sleetflake.reset().
        const angleDeg = randomInRange(CONFIG.sleet.angle.min, CONFIG.sleet.angle.max);
        this.angleDeg = angleDeg * randomSign();

        this.resize();
        this._startResizeListener();
    }

    _syncParticles(canvasWidth, canvasHeight) {
        this.sleetflakes.forEach(flake => {
            flake.canvasWidth = canvasWidth;
            flake.canvasHeight = canvasHeight;
        });

        this._adjustParticleCount(canvasWidth, canvasHeight);
    }

    /**
     * Adjust particle count to match the target for the current viewport.
     * Density is scaled down on coarse-pointer (mobile-class) devices to keep
     * per-frame draw cost low on weaker hardware.
     */
    _adjustParticleCount(canvasWidth, canvasHeight) {
        const densityScale = prefersCoarsePointer() ? CONFIG.performance.mobileParticleScale : 1;
        const targetTotal = Math.max(
            Math.floor((canvasWidth * canvasHeight * densityScale) / CONFIG.sleet.dropsPerArea),
            MIN_SLEET_PARTICLES
        );
        const currentTotal = this.sleetflakes.length;

        if (targetTotal > currentTotal) {
            const toAdd = targetTotal - currentTotal;
            for (let i = 0; i < toAdd; i++) {
                this.sleetflakes.push(new Sleetflake(canvasWidth, canvasHeight, this.angleDeg));
            }
        } else if (targetTotal < currentTotal) {
            this.sleetflakes.length = targetTotal;
        }
    }

    update(delta) {
        if (!this.enabled) return;

        this.sleetflakes.forEach(flake => flake.update(delta));
    }

    /**
     * Draw all particles, batched by strokeStyle (quantized opacity) to minimize
     * canvas state changes — one stroke() call per opacity group.
     */
    draw() {
        if (!this.enabled) return;

        const ctx = this.ctx;
        ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        const groups = new Map();
        for (const flake of this.sleetflakes) {
            let path = groups.get(flake.strokeStyle);
            if (!path) {
                path = new Path2D();
                groups.set(flake.strokeStyle, path);
            }
            path.moveTo(flake.x, flake.y);
            path.lineTo(flake.x + flake.dirX * flake.length, flake.y + flake.dirY * flake.length);
        }

        ctx.lineWidth = CONFIG.sleet.lineWidth;
        ctx.lineCap = 'butt';
        for (const [style, path] of groups) {
            ctx.strokeStyle = style;
            ctx.stroke(path);
        }
    }
}
