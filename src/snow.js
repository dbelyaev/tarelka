/**
 * Snow effect with parallax layers
 * 
 * Performance: snowflake opacity is quantized to 0.1 increments so that flakes
 * share fillStyle values and can be batched — one fill() call per opacity group.
 * Flakes with radius ≤ 2px use fillRect() instead of arc() since they are
 * visually indistinguishable from squares at that size.
 */
import { CONFIG } from './config.js';
import { isSnowSeason, prefersCoarsePointer, pickWeightedIndex } from './utils.js';
import { CanvasEffect } from './canvas-effect.js';

/** Layer distribution ratios: background, middle, foreground */
const LAYER_DISTRIBUTION = [0.3, 0.4, 0.3];

/** Radius threshold — at or below this, fillRect is used instead of arc */
const SMALL_FLAKE_THRESHOLD = 2;

/** Minimum snowflake count so the effect stays visible on very small viewports */
const MIN_SNOWFLAKES = 10;

/**
 * Snowflake class
 */
class Snowflake {
    constructor(canvasWidth, canvasHeight, layer) {
        this.reset(canvasWidth, canvasHeight, layer, true);
    }
    
    reset(canvasWidth, canvasHeight, layer, initial = false) {
        this.x = Math.random() * canvasWidth;
        this.y = initial ? Math.random() * canvasHeight : -10;
        this.layer = layer;
        
        // Layer properties for parallax effect
        // Layer 0 (background): slower, smaller, more transparent
        // Layer 2 (foreground): faster, larger, more opaque
        const layerScale = 0.5 + (layer * 0.3); // 0.5, 0.8, 1.1
        
        this.radius = (1 + Math.random() * 2.5) * layerScale;
        this.speed = (0.5 + Math.random() * 1) * layerScale;
        this.drift = (Math.random() - 0.5) * 0.5 * layerScale;
        this.opacity = Math.round((0.3 + Math.random() * 0.4) * layerScale * 10) / 10;
        this.fillStyle = `rgba(255, 255, 255, ${this.opacity})`;
        this.canvasWidth = canvasWidth;
        this.canvasHeight = canvasHeight;
    }
    
    update(delta) {
        // Fall down
        this.y += this.speed * delta * 60;
        
        // Drift horizontally
        this.x += this.drift * delta * 60;
        
        // Reset if out of bounds
        if (this.y > this.canvasHeight + 10) {
            this.reset(this.canvasWidth, this.canvasHeight, this.layer, false);
        }
        
        // Wrap horizontally
        if (this.x > this.canvasWidth + 10) {
            this.x = -10;
        } else if (this.x < -10) {
            this.x = this.canvasWidth + 10;
        }
    }
}

/**
 * Snow effect manager
 */
export class SnowEffect extends CanvasEffect {
    constructor() {
        super({
            className: 'snow-canvas',
            storageKey: 'snowEnabled',
            // Respect user preference, fall back to the seasonal default
            resolveDefaultEnabled: () => isSnowSeason(CONFIG.snow.winterMonths)
        });
        this.snowflakes = [];

        this.resize();
        this._startResizeListener();
    }

    _syncParticles(canvasWidth, canvasHeight) {
        // Update existing snowflakes with new dimensions
        this.snowflakes.forEach(flake => {
            flake.canvasWidth = canvasWidth;
            flake.canvasHeight = canvasHeight;
        });

        // Recalculate target flake count for the new viewport area
        this._adjustFlakeCount(canvasWidth, canvasHeight);
    }

    /**
     * Adjust snowflake count to match the target for the current viewport.
     * Adds or removes flakes proportionally across layers.
     */
    _adjustFlakeCount(canvasWidth, canvasHeight) {
        const densityScale = prefersCoarsePointer() ? CONFIG.performance.mobileParticleScale : 1;
        const targetTotal = Math.max(
            Math.floor((canvasWidth * canvasHeight * densityScale) / CONFIG.snow.flakesPerArea),
            MIN_SNOWFLAKES
        );
        const currentTotal = this.snowflakes.length;
        
        if (targetTotal > currentTotal) {
            // Add flakes, distributing across layers
            const toAdd = targetTotal - currentTotal;
            for (let i = 0; i < toAdd; i++) {
                const layer = this._pickLayer();
                this.snowflakes.push(new Snowflake(canvasWidth, canvasHeight, layer));
            }
        } else if (targetTotal < currentTotal) {
            // Remove excess flakes proportionally using the largest-remainder method.
            // Because flakes are added via weighted randomness, a layer's actual count
            // may be less than its ideal quota; cap each quota to available flakes and
            // redistribute any deficit to layers with spare capacity so the final total
            // always equals targetTotal.
            const allocations = LAYER_DISTRIBUTION.map((ratio, layer) => {
                const exact = targetTotal * ratio;
                const quota = Math.floor(exact);
                return {
                    quota,
                    remainder: exact - quota,
                    flakes: this.snowflakes.filter(f => f.layer === layer)
                };
            });

            // Phase 1: distribute rounding remainder by largest fractional overshoot
            let remaining = targetTotal - allocations.reduce((s, a) => s + a.quota, 0);
            allocations
                .slice()
                .sort((a, b) => b.remainder - a.remainder)
                .forEach(a => { if (remaining > 0) { a.quota++; remaining--; } });

            // Phase 2: cap each quota to what the layer actually has
            allocations.forEach(a => { a.quota = Math.min(a.quota, a.flakes.length); });

            // Phase 3: redistribute deficit to layers with spare capacity
            let deficit = targetTotal - allocations.reduce((s, a) => s + a.quota, 0);
            if (deficit > 0) {
                allocations
                    .slice()
                    .sort((a, b) => b.remainder - a.remainder)
                    .forEach(a => {
                        if (deficit <= 0) return;
                        const spare = a.flakes.length - a.quota;
                        if (spare <= 0) return;
                        const extra = Math.min(spare, deficit);
                        a.quota += extra;
                        deficit -= extra;
                    });
            }

            this.snowflakes = allocations.flatMap(({ quota, flakes }) => flakes.slice(0, quota));
        }
    }
    
    /**
     * Pick a layer for a new snowflake using weighted random selection
     * based on LAYER_DISTRIBUTION ratios.
     */
    _pickLayer() {
        return pickWeightedIndex(LAYER_DISTRIBUTION);
    }
    
    update(delta) {
        if (!this.enabled) return;
        
        this.snowflakes.forEach(flake => flake.update(delta));
    }
    
    /**
     * Draw all snowflakes, batched by fillStyle (quantized opacity) to minimize
     * canvas state changes. Small flakes (radius ≤ 2px) use fillRect; larger
     * ones use a single Path2D per group.
     */
    draw() {
        if (!this.enabled) return;
        
        const ctx = this.ctx;
        ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Group snowflakes by fillStyle for batched drawing
        const groups = new Map();
        for (const flake of this.snowflakes) {
            let group = groups.get(flake.fillStyle);
            if (!group) {
                group = { small: [], large: [] };
                groups.set(flake.fillStyle, group);
            }
            if (flake.radius <= SMALL_FLAKE_THRESHOLD) {
                group.small.push(flake);
            } else {
                group.large.push(flake);
            }
        }
        
        // Draw each group with a single fillStyle assignment and minimal draw calls
        for (const [style, group] of groups) {
            ctx.fillStyle = style;
            
            // Small flakes: fillRect is cheaper than arc for tiny circles
            for (const flake of group.small) {
                const d = flake.radius * 2;
                ctx.fillRect(flake.x - flake.radius, flake.y - flake.radius, d, d);
            }
            
            // Large flakes: batch into a single Path2D, one fill() call per group
            if (group.large.length > 0) {
                const path = new Path2D();
                for (const flake of group.large) {
                    path.moveTo(flake.x + flake.radius, flake.y);
                    path.arc(flake.x, flake.y, flake.radius, 0, Math.PI * 2);
                }
                ctx.fill(path);
            }
        }
    }
}
