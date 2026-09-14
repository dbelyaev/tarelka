/**
 * Wind effect — faint horizontal streaks drifting across the viewport
 *
 * Unlike rain, wind has no gravity axis: streaks travel roughly horizontally
 * (a shared base direction rolled once per instance, like rain's angleDeg)
 * and spawn at a random height across the full viewport rather than falling
 * from the top. 3 parallax layers are used — same LAYER_DISTRIBUTION/
 * layerScale formula as snow — because flat horizontal lines need layer
 * variance in length/speed/opacity to read as gusting depth; rain's skew
 * already reads as directional on its own, but wind's near-horizontal
 * streaks would otherwise look like a static grid.
 *
 * Performance: opacity is quantized to 0.1 increments so streaks share
 * strokeStyle values and can be batched — one stroke() call per opacity
 * group, mirroring rain's approach.
 */
import { CONFIG } from './config.js';
import { prefersCoarsePointer, randomInRange, randomSign } from './utils.js';
import { CanvasEffect } from './canvas-effect.js';

/** Layer distribution ratios: background, middle, foreground */
const LAYER_DISTRIBUTION = [0.3, 0.4, 0.3];

/** Minimum streak count so the effect stays visible on very small viewports */
const MIN_WIND_STREAKS = 10;

/**
 * WindStreak — a short line segment drifting along a near-horizontal direction vector
 */
class WindStreak {
    constructor(canvasWidth, canvasHeight, layer, baseDirSign) {
        this.layer = layer;
        this.baseDirSign = baseDirSign;
        this.reset(canvasWidth, canvasHeight, layer, true);
    }

    reset(canvasWidth, canvasHeight, layer, initial = false) {
        this.layer = layer;
        this.canvasWidth = canvasWidth;
        this.canvasHeight = canvasHeight;

        const layerScale = 0.5 + (layer * 0.3); // 0.5, 0.8, 1.1
        this.length = randomInRange(CONFIG.wind.length.min, CONFIG.wind.length.max) * layerScale;
        this.speed = randomInRange(CONFIG.wind.speed.min, CONFIG.wind.speed.max) * layerScale;
        this.opacity = Math.round(randomInRange(CONFIG.wind.opacity.min, CONFIG.wind.opacity.max) * layerScale * 10) / 10;
        this.strokeStyle = `rgba(220, 225, 230, ${this.opacity})`;

        // Angle measured off horizontal, wobbling around the shared base direction
        const jitterDeg = randomInRange(-CONFIG.wind.angleJitter, CONFIG.wind.angleJitter);
        const angleDeg = randomInRange(CONFIG.wind.angle.min, CONFIG.wind.angle.max) + jitterDeg;
        const rad = angleDeg * Math.PI / 180;
        this.dirX = Math.cos(rad) * this.baseDirSign;
        this.dirY = Math.sin(rad);

        // No gravity axis — spawn at the trailing edge in the direction of travel,
        // at a random height across the full viewport.
        this.y = randomInRange(0, canvasHeight);
        this.x = initial
            ? randomInRange(0, canvasWidth)
            : (this.baseDirSign > 0 ? -this.length : canvasWidth + this.length);
    }

    update(delta) {
        this.x += this.dirX * this.speed * delta * 60;
        this.y += this.dirY * this.speed * delta * 60;

        const past = this.baseDirSign > 0
            ? this.x - this.length > this.canvasWidth
            : this.x + this.length < 0;
        if (past) {
            this.reset(this.canvasWidth, this.canvasHeight, this.layer, false);
        }

        // Wrap vertically (small dirY drift shouldn't ever run a streak off-screen for long)
        if (this.y > this.canvasHeight + 10) {
            this.y = -10;
        } else if (this.y < -10) {
            this.y = this.canvasHeight + 10;
        }
    }
}

/**
 * Wind effect manager
 */
export class WindEffect extends CanvasEffect {
    constructor() {
        super({
            className: 'wind-canvas',
            ps1ClassName: 'wind-canvas--ps1',
            storageKey: 'windEnabled',
            // No seasonal default (like rain) — wind has no natural "season" signal
            resolveDefaultEnabled: () => false
        });
        this.streaks = [];

        // One shared base direction for the whole instance — all streaks blow the same way.
        this.baseDirSign = randomSign();

        this.resize();
        this._startResizeListener();
    }

    _syncParticles(canvasWidth, canvasHeight) {
        this.streaks.forEach(streak => {
            streak.canvasWidth = canvasWidth;
            streak.canvasHeight = canvasHeight;
        });

        this._adjustStreakCount(canvasWidth, canvasHeight);
    }

    /**
     * Adjust streak count to match the target for the current viewport.
     * Mirrors SnowEffect._adjustFlakeCount's largest-remainder layer redistribution.
     */
    _adjustStreakCount(canvasWidth, canvasHeight) {
        const densityScale = prefersCoarsePointer() ? CONFIG.performance.mobileParticleScale : 1;
        const targetTotal = Math.max(
            Math.floor((canvasWidth * canvasHeight * densityScale) / CONFIG.wind.streaksPerArea),
            MIN_WIND_STREAKS
        );
        const currentTotal = this.streaks.length;

        if (targetTotal > currentTotal) {
            const toAdd = targetTotal - currentTotal;
            for (let i = 0; i < toAdd; i++) {
                const layer = this._pickLayer();
                this.streaks.push(new WindStreak(canvasWidth, canvasHeight, layer, this.baseDirSign));
            }
        } else if (targetTotal < currentTotal) {
            const allocations = LAYER_DISTRIBUTION.map((ratio, layer) => {
                const exact = targetTotal * ratio;
                const quota = Math.floor(exact);
                return {
                    quota,
                    remainder: exact - quota,
                    streaks: this.streaks.filter(s => s.layer === layer)
                };
            });

            let remaining = targetTotal - allocations.reduce((s, a) => s + a.quota, 0);
            allocations
                .slice()
                .sort((a, b) => b.remainder - a.remainder)
                .forEach(a => { if (remaining > 0) { a.quota++; remaining--; } });

            allocations.forEach(a => { a.quota = Math.min(a.quota, a.streaks.length); });

            let deficit = targetTotal - allocations.reduce((s, a) => s + a.quota, 0);
            if (deficit > 0) {
                allocations
                    .slice()
                    .sort((a, b) => b.remainder - a.remainder)
                    .forEach(a => {
                        if (deficit <= 0) return;
                        const spare = a.streaks.length - a.quota;
                        if (spare <= 0) return;
                        const extra = Math.min(spare, deficit);
                        a.quota += extra;
                        deficit -= extra;
                    });
            }

            this.streaks = allocations.flatMap(({ quota, streaks }) => streaks.slice(0, quota));
        }
    }

    /**
     * Pick a layer for a new streak using weighted random selection
     * based on LAYER_DISTRIBUTION ratios.
     */
    _pickLayer() {
        const r = Math.random();
        if (r < LAYER_DISTRIBUTION[0]) return 0;
        if (r < LAYER_DISTRIBUTION[0] + LAYER_DISTRIBUTION[1]) return 1;
        return 2;
    }

    update(delta) {
        if (!this.enabled) return;

        this.streaks.forEach(streak => streak.update(delta));
    }

    /**
     * Draw all streaks, batched by strokeStyle (quantized opacity) to minimize
     * canvas state changes — one stroke() call per opacity group.
     */
    draw() {
        if (!this.enabled) return;

        const ctx = this.ctx;
        ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        const groups = new Map();
        for (const streak of this.streaks) {
            let path = groups.get(streak.strokeStyle);
            if (!path) {
                path = new Path2D();
                groups.set(streak.strokeStyle, path);
            }
            path.moveTo(streak.x, streak.y);
            path.lineTo(streak.x + streak.dirX * streak.length, streak.y + streak.dirY * streak.length);
        }

        ctx.lineWidth = CONFIG.wind.lineWidth;
        ctx.lineCap = 'butt';
        for (const [style, path] of groups) {
            ctx.strokeStyle = style;
            ctx.stroke(path);
        }
    }
}
