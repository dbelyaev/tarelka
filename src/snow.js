/**
 * Snow effect with parallax layers
 * 
 * Performance: snowflakes are batched by fillStyle (opacity group) and drawn
 * with a single fill() per group. Flakes with radius ≤ 2px use fillRect()
 * instead of arc() since they are visually indistinguishable from squares.
 */
import { CONFIG } from './config.js';
import { isSnowSeason, debounce } from './utils.js';

/** Layer distribution ratios: background, middle, foreground */
const LAYER_DISTRIBUTION = [0.3, 0.4, 0.3];

/** Radius threshold — at or below this, fillRect is used instead of arc */
const SMALL_FLAKE_THRESHOLD = 2;

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
        this.opacity = (0.3 + Math.random() * 0.4) * layerScale;
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
export class SnowEffect {
    constructor() {
        this.canvas = document.createElement('canvas');
        this.ctx = this.canvas.getContext('2d');
        this.snowflakes = [];
        
        // Determine snow enabled state: respect user preference, fall back to seasonal default
        const stored = localStorage.getItem('snowEnabled');
        this.enabled = stored !== null ? stored === 'true' : isSnowSeason(CONFIG.snow.winterMonths);
        
        // Style canvas
        this.canvas.className = 'snow-canvas';
        this.canvas.setAttribute('aria-hidden', 'true');
        
        document.querySelector('main').appendChild(this.canvas);
        
        this.resize();
        this.createSnowflakes();
        
        // Handle window resize (debounced to match renderer resize behavior)
        this.resizeHandler = debounce(() => this.resize(), CONFIG.resize.debounceMs);
        window.addEventListener('resize', this.resizeHandler);
    }
    
    resize() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
        
        const w = this.canvas.width;
        const h = this.canvas.height;
        
        // Update existing snowflakes with new dimensions
        this.snowflakes.forEach(flake => {
            flake.canvasWidth = w;
            flake.canvasHeight = h;
        });
        
        // Recalculate target flake count for the new viewport area
        this._adjustFlakeCount(w, h);
    }
    
    /**
     * Adjust snowflake count to match the target for the current viewport.
     * Adds or removes flakes proportionally across layers.
     */
    _adjustFlakeCount(canvasWidth, canvasHeight) {
        const targetTotal = Math.floor((canvasWidth * canvasHeight) / CONFIG.snow.flakesPerArea);
        const currentTotal = this.snowflakes.length;
        
        if (targetTotal > currentTotal) {
            // Add flakes, distributing across layers
            const toAdd = targetTotal - currentTotal;
            for (let i = 0; i < toAdd; i++) {
                const layer = this._pickLayer(i, toAdd);
                this.snowflakes.push(new Snowflake(canvasWidth, canvasHeight, layer));
            }
        } else if (targetTotal < currentTotal) {
            // Remove excess flakes from the end
            this.snowflakes.length = targetTotal;
        }
    }
    
    /**
     * Pick a layer for a new snowflake based on distribution ratios.
     */
    _pickLayer(index, total) {
        const ratio = index / total;
        if (ratio < LAYER_DISTRIBUTION[0]) return 0;
        if (ratio < LAYER_DISTRIBUTION[0] + LAYER_DISTRIBUTION[1]) return 1;
        return 2;
    }
    
    createSnowflakes() {
        const numFlakes = Math.floor((this.canvas.width * this.canvas.height) / CONFIG.snow.flakesPerArea);
        
        // Create 3 layers with different quantities
        for (let layer = 0; layer < 3; layer++) {
            const count = Math.floor(numFlakes * LAYER_DISTRIBUTION[layer]);
            for (let i = 0; i < count; i++) {
                this.snowflakes.push(new Snowflake(this.canvas.width, this.canvas.height, layer));
            }
        }
    }
    
    update(delta) {
        if (!this.enabled) return;
        
        this.snowflakes.forEach(flake => flake.update(delta));
    }
    
    /**
     * Draw all snowflakes, batched by fillStyle to minimize canvas state changes.
     * Small flakes (radius ≤ 2px) use fillRect; larger ones use a single Path2D per group.
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
    
    toggle() {
        this.enabled = !this.enabled;
        localStorage.setItem('snowEnabled', String(this.enabled));
        if (!this.enabled) {
            this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        }
    }
    
    cleanup() {
        window.removeEventListener('resize', this.resizeHandler);
        if (this.canvas.parentNode) {
            this.canvas.parentNode.removeChild(this.canvas);
        }
    }
}
